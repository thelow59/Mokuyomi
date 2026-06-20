let volumes = [];
let readerState = null;
let overlayVisible = true;
let immersionInterval = null;
let sessionStart = 0;
let activeSeries = '';
let activeVolume = '';

// Zoom & pan
let zoomLevel = 1;
let baseScale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('hashchange', router);
  window.addEventListener('resize', () => { if (readerState) initZoom(); });
  window.addEventListener('beforeunload', endImmersionSession);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      endImmersionSession();
    } else if (readerState) {
      startImmersionSession(readerState.seriesDir, readerState.volumeDir);
    } else {
      refreshFromServer();
    }
  });
  router();
});

function router() {
  endImmersionSession();
  const hash = location.hash.slice(1) || '/';
  if (hash.startsWith('/reader/')) {
    const parts = hash.split('/');
    showReader(decodeURIComponent(parts[2]), decodeURIComponent(parts[3]));
  } else if (hash.startsWith('/series/')) {
    const parts = hash.split('/');
    showSeries(decodeURIComponent(parts[2]));
  } else {
    showLibrary();
  }
}

let progressCache = null;

function getProgress() {
  if (progressCache) return progressCache;
  try { progressCache = JSON.parse(localStorage.getItem('mokuro_progress') || '{}'); }
  catch { progressCache = {}; }
  return progressCache;
}

function saveProgress(uuid, page) {
  const p = getProgress();
  p[uuid] = page;
  progressCache = p;
  localStorage.setItem('mokuro_progress', JSON.stringify(p));
  try { fetch('/api/progress', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p), keepalive: true }); } catch {}
}

async function loadProgressFromServer() {
  try {
    const res = await fetch('/api/progress');
    if (res.ok) {
      const data = await res.json();
      progressCache = data;
      localStorage.setItem('mokuro_progress', JSON.stringify(data));
    }
  } catch {}
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===== Immersion Timer =====
let immersionCache = null;

function getImmersion() {
  if (immersionCache) return immersionCache;
  try { immersionCache = JSON.parse(localStorage.getItem('mokuro_immersion') || '{}'); }
  catch { immersionCache = {}; }
  return immersionCache;
}

function setImmersion(data) {
  immersionCache = data;
  localStorage.setItem('mokuro_immersion', JSON.stringify(data));
  try { fetch('/api/immersion', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data), keepalive: true }); } catch {}
}

async function loadImmersionFromServer() {
  try {
    const res = await fetch('/api/immersion');
    if (res.ok) {
      const data = await res.json();
      immersionCache = data;
      localStorage.setItem('mokuro_immersion', JSON.stringify(data));
    }
  } catch {}
}

function immersionKey(series, volume) {
  return series + '/' + volume;
}

function endImmersionSession() {
  if (!sessionStart) return;
  const elapsed = Date.now() - sessionStart;
  if (elapsed > 1000) {
    const key = immersionKey(activeSeries, activeVolume);
    const data = getImmersion();
    data[key] = (data[key] || 0) + elapsed;
    setImmersion(data);
  }
  sessionStart = 0;
  if (immersionInterval) {
    clearInterval(immersionInterval);
    immersionInterval = null;
  }
}

function startImmersionSession(seriesDir, volumeDir) {
  endImmersionSession();
  activeSeries = seriesDir;
  activeVolume = volumeDir;
  sessionStart = Date.now();
  if (immersionInterval) clearInterval(immersionInterval);
  immersionInterval = setInterval(() => {
    const elapsed = Date.now() - sessionStart;
    const el = document.getElementById('liveTimer');
    if (el) el.textContent = formatDurationShort(elapsed);
  }, 1000);
}

function formatDurationShort(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const sec = s % 60;
  const min = m % 60;
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function totalImmersion() {
  const data = getImmersion();
  let total = 0;
  for (const key in data) total += data[key];
  return total;
}

function seriesImmersion(seriesDir) {
  const data = getImmersion();
  let total = 0;
  for (const key in data) {
    if (key.startsWith(seriesDir + '/')) total += data[key];
  }
  return total;
}

function refreshFromServer() {
  if (readerState) return;
  Promise.all([loadImmersionFromServer(), loadProgressFromServer()]).then(() => {
    const hash = location.hash.slice(1) || '/';
    if (hash.startsWith('/series/')) {
      const parts = hash.split('/');
      showSeries(decodeURIComponent(parts[2]));
    } else if (!hash.startsWith('/reader/')) {
      renderLibrary();
    }
  });
}

// ===== Library =====
async function showLibrary() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="library-header">Mokuro Reader</div><div class="library-grid"><div class="spinner"></div></div>';

  try {
    volumes = await (await fetch('/api/volumes')).json();
    await Promise.all([loadImmersionFromServer(), loadProgressFromServer()]);
    renderLibrary();
  } catch {
    document.querySelector('.library-grid').innerHTML =
      '<div class="library-empty">Failed to load library.</div>';
  }
}

function renderLibrary() {
  const container = document.querySelector('.library-grid');
  if (!volumes.length) {
    container.innerHTML =
      '<div class="library-empty">No manga found.<br>Place mokuro-processed volumes in <code>manga/</code> directory.</div>';
    return;
  }

  const progress = getProgress();

  const groups = {};
  for (const v of volumes) {
    const key = v.title_uuid || v.series_dir;
    if (!groups[key]) groups[key] = { series: v.series, series_dir: v.series_dir, vols: [] };
    groups[key].vols.push(v);
  }

  container.innerHTML = Object.values(groups).map(group => {
    const { series, series_dir, vols } = group;
    const first = vols[0];

    let totalPages = 0, totalRead = 0;
    for (const v of vols) {
      totalPages += v.page_count;
      totalRead += progress[v.volume_uuid] ?? 0;
    }
    const seriesPct = totalPages > 0 ? Math.round(totalRead / totalPages * 100) : 0;

    return `
      <div class="series-card" data-series="${series_dir}">
        <div class="cover">
          ${first.cover ? `<img src="${first.cover}" loading="lazy" alt="" onerror="this.style.display='none'">` : '📕'}
        </div>
        <div class="info">
          <div class="series-title">${escHtml(series)}</div>
          <div class="series-meta">${vols.length} volume${vols.length > 1 ? 's' : ''}</div>
          <div class="progress-bar"><div class="fill" style="width:${seriesPct}%"></div></div>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.series-card').forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `/series/${card.dataset.series}`;
    });
  });

  const header = document.querySelector('.library-header');
  let immHtml = header.querySelector('.library-immersion');
  const total = totalImmersion();
  if (total > 0) {
    if (immHtml) immHtml.textContent = `Total immersion: ${formatDuration(total)}`;
    else header.innerHTML += `<div class="library-immersion">Total immersion: ${formatDuration(total)}</div>`;
  } else if (immHtml) {
    immHtml.remove();
  }
}

function showSeries(seriesDir) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="series-page">
      <div class="series-page-header">
        <button class="back-btn" id="seriesBackBtn">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Library
        </button>
        <span class="series-page-title" id="seriesPageTitle"></span>
      </div>
      <div class="series-grid"></div>
    </div>`;

  document.getElementById('seriesBackBtn').addEventListener('click', () => {
    location.hash = '/';
  });

  const grid = document.querySelector('.series-grid');
  const seriesVols = volumes.filter(v => v.series_dir === seriesDir);
  if (!seriesVols.length) {
    grid.innerHTML = '<div class="library-empty">Series not found.</div>';
    return;
  }

  const progress = getProgress();
  const seriesName = escHtml(seriesVols[0].series);

  const titleEl = document.getElementById('seriesPageTitle');
  titleEl.textContent = seriesName;
  titleEl.dataset.series = seriesDir;
  titleEl.dataset.baseName = seriesName;

  const immersionData = getImmersion();
  const seriesIm = seriesImmersion(seriesDir);
  if (seriesIm > 0) titleEl.textContent += ` — ${formatDuration(seriesIm)}`;

  loadImmersionFromServer().then(() => {
    const im = seriesImmersion(seriesDir);
    const base = titleEl.dataset.baseName || seriesName;
    titleEl.textContent = base + (im > 0 ? ` — ${formatDuration(im)}` : '');
  });

  grid.innerHTML = seriesVols.map(v => {
    const p = progress[v.volume_uuid] ?? 0;
    const pct = v.page_count > 0 ? Math.round(p / v.page_count * 100) : 0;
    const volKey = immersionKey(v.series_dir, v.volume_dir);
    const volMs = immersionData[volKey] || 0;
    const volTime = volMs > 0 ? formatDuration(volMs) : '';
    return `
      <div class="volume-card" data-series="${v.series_dir}" data-volume="${v.volume_dir}"${volTime ? ` title="${volTime}"` : ''}>
        <div class="cover">
          ${v.cover ? `<img src="${v.cover}" loading="lazy" alt="" onerror="this.style.display='none'">` : '📕'}
        </div>
        <div class="info">
          <div class="volume-title">${escHtml(v.volume)}</div>
          <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.volume-card').forEach(card => {
    card.addEventListener('click', () => {
      location.hash = `/reader/${card.dataset.series}/${card.dataset.volume}`;
    });
  });
}

// ===== Reader =====
async function showReader(seriesDir, volumeDir) {
  overlayVisible = false;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="reader-container">
      <div class="reader-topbar" id="topbar">
        <button class="back-btn" id="backBtn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Library
        </button>
        <span class="live-timer" id="liveTimer">00:00</span>
        <span class="page-indicator" id="pageIndicator">- / -</span>
        <button class="toggle-overlay-btn ${overlayVisible ? 'active' : ''}" id="toggleOverlay">AA</button>
      </div>
      <div class="reader-viewport" id="viewport">
        <div class="spinner"></div>
      </div>
      <div class="reader-bottom-bar" id="bottomBar">
        <button class="nav-btn" id="prevBtn">← Prev</button>
        <span class="page-indicator-bottom" id="pageIndicatorBottom">- / -</span>
        <button class="nav-btn" id="nextBtn">Next →</button>
      </div>
    </div>`;

  document.getElementById('backBtn').addEventListener('click', () => { location.hash = '/series/' + seriesDir; });
  document.getElementById('toggleOverlay').addEventListener('click', toggleOverlay);
  document.getElementById('prevBtn').addEventListener('click', prevPage);
  document.getElementById('nextBtn').addEventListener('click', nextPage);

  let data = null;
  try {
    const vol = volumes.find(
      v => v.series_dir === seriesDir && v.volume_dir === volumeDir
    );
    if (vol) {
      const res = await fetch(`/api/mokuro/${vol.mokuro_path}`);
      if (res.ok) data = await res.json();
    }
  } catch {}
  if (!data) {
    try {
      const names = [`${volumeDir}.mokuro`, `${seriesDir}.mokuro`];
      for (const n of names) {
        const r = await fetch(`/api/mokuro/manga/${seriesDir}/${n}`);
        if (r.ok) { data = await r.json(); break; }
      }
    } catch {}
  }
  if (!data) {
    document.getElementById('viewport').innerHTML =
      '<div class="library-empty">Failed to load manga.<br>Make sure the .mokuro file exists.</div>';
    return;
  }
  readerState = {
    data,
    seriesDir,
    volumeDir,
    pages: data.pages || [],
    currentPage: loadProgress(data.volume_uuid),
  };
  renderPage();
  startImmersionSession(seriesDir, volumeDir);
}

function loadProgress(uuid) {
  const p = getProgress();
  return p[uuid] ?? 0;
}

function renderPage() {
  if (!readerState) return;
  const { pages, currentPage, seriesDir, volumeDir } = readerState;
  const page = pages[currentPage];
  if (!page) return;

  const pageStr = `${currentPage + 1} / ${pages.length}`;
  document.getElementById('pageIndicator').textContent = pageStr;
  document.getElementById('pageIndicatorBottom').textContent = pageStr;

  document.getElementById('prevBtn').disabled = currentPage === 0;
  document.getElementById('nextBtn').disabled = currentPage >= pages.length - 1;

  const viewport = document.getElementById('viewport');
  const imgUrl = `/manga/${seriesDir}/${volumeDir}/${page.img_path}`;

  viewport.innerHTML = `
    <div class="page-wrapper" id="pageWrapper">
      <img src="${imgUrl}" alt="Page ${currentPage + 1}" id="pageImage" onload="onPageLoad()">
      <div class="overlay-container ${overlayVisible ? 'visible' : ''}" id="overlayContainer"></div>
    </div>`;

  saveProgress(readerState.data.volume_uuid, currentPage);

  [currentPage + 1, currentPage + 2, currentPage - 1].forEach(i => {
    if (i >= 0 && i < pages.length && i !== currentPage) {
      const img = new Image();
      img.src = `/manga/${seriesDir}/${volumeDir}/${pages[i].img_path}`;
    }
  });
}

function onPageLoad() {
  initZoom();
  renderOverlays();
}

function initZoom() {
  const img = document.getElementById('pageImage');
  const vp = document.getElementById('viewport');
  if (!img || !vp) return;
  const vpW = vp.clientWidth;
  const vpH = vp.clientHeight;
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  baseScale = Math.min(vpW / iw, vpH / ih, 1);
  zoomLevel = 1;
  centerImage();
}

function centerImage() {
  const img = document.getElementById('pageImage');
  const vp = document.getElementById('viewport');
  if (!img || !vp) return;
  const vpW = vp.clientWidth;
  const vpH = vp.clientHeight;
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const s = baseScale * zoomLevel;
  panX = (vpW - iw * s) / 2;
  panY = (vpH - ih * s) / 2;
  applyTransform();
}

function applyTransform() {
  const wrapper = document.getElementById('pageWrapper');
  if (!wrapper) return;
  const s = baseScale * zoomLevel;
  wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${s})`;
}

function zoomAt(cx, cy, delta) {
  const oldZoom = zoomLevel;
  zoomLevel = Math.max(1, Math.min(5, zoomLevel + delta));
  const oldS = baseScale * oldZoom;
  const newS = baseScale * zoomLevel;
  const imgX = (cx - panX) / oldS;
  const imgY = (cy - panY) / oldS;
  panX = cx - imgX * newS;
  panY = cy - imgY * newS;
  applyTransform();
}

function resetZoom() {
  zoomLevel = 1;
  centerImage();
}

function renderOverlays() {
  const container = document.getElementById('overlayContainer');
  if (!container || !readerState) return;

  const page = readerState.pages[readerState.currentPage];
  if (!page || !page.blocks || !page.blocks.length) return;

  const img = document.getElementById('pageImage');
  const imgW = page.img_width || (img ? img.naturalWidth : 1);
  const imgH = page.img_height || (img ? img.naturalHeight : 1);
  const displayW = img ? (img.clientWidth || img.getBoundingClientRect().width) : imgW;
  const scale = displayW / imgW;

  container.innerHTML = page.blocks.map(block => {
    const [x1, y1, x2, y2] = block.box;
    const bw = x2 - x1;
    const bh = y2 - y1;
    const fs = (block.font_size || 16) * scale;
    const lines = block.lines || [];
    const isVertical = block.vertical === true;

    const linesHtml = lines.map(line =>
      `<span class="line" style="font-size:${fs}px">${escHtml(String(line))}</span>`
    ).join('');

    const cls = `text-block ${isVertical ? 'vertical' : 'horizontal'}`;
    return `<div class="${cls}" style="left:${x1/imgW*100}%;top:${y1/imgH*100}%;width:${bw/imgW*100}%;height:${bh/imgH*100}%">${linesHtml}</div>`;
  }).join('');
}

function nextPage() {
  if (!readerState || readerState.currentPage >= readerState.pages.length - 1) return;
  readerState.currentPage++;
  renderPage();
}

function prevPage() {
  if (!readerState || readerState.currentPage <= 0) return;
  readerState.currentPage--;
  renderPage();
}

function toggleOverlay() {
  overlayVisible = !overlayVisible;
  const c = document.getElementById('overlayContainer');
  const b = document.getElementById('toggleOverlay');
  if (c) c.classList.toggle('visible', overlayVisible);
  if (b) b.classList.toggle('active', overlayVisible);
}

// Tap text block to activate (mobile)
document.addEventListener('click', e => {
  const block = e.target.closest('.text-block');
  if (block) {
    e.stopPropagation();
    block.classList.toggle('active');
    return;
  }
});

// Toggle top/bottom bars when tapping page background
document.addEventListener('click', e => {
  const viewport = document.getElementById('viewport');
  if (!viewport || !viewport.contains(e.target)) return;
  if (e.target.closest('.reader-topbar') || e.target.closest('.reader-bottom-bar') || e.target.closest('.text-block')) return;

  const topbar = document.getElementById('topbar');
  const bottomBar = document.getElementById('bottomBar');
  if (topbar) topbar.classList.toggle('hidden');
  if (bottomBar) bottomBar.classList.toggle('hidden');
});

document.addEventListener('keydown', e => {
  if (!readerState) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
});

// ===== Zoom & Pan =====
document.addEventListener('wheel', e => {
  if (!readerState) return;
  const vp = document.getElementById('viewport');
  if (!vp || !vp.contains(e.target)) return;
  if (e.target.closest('.reader-topbar') || e.target.closest('.reader-bottom-bar')) return;
  e.preventDefault();
  const rect = vp.getBoundingClientRect();
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? -0.1 : 0.1);
}, { passive: false });

document.addEventListener('mousedown', e => {
  const vp = document.getElementById('viewport');
  if (!vp || !vp.contains(e.target)) return;
  if (e.target.closest('.text-block') || e.target.closest('.reader-topbar') || e.target.closest('.reader-bottom-bar')) return;
  isDragging = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;
  vp.classList.add('grabbing');
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (isDragging) {
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
    applyTransform();
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    const vp = document.getElementById('viewport');
    if (vp) vp.classList.remove('grabbing');
  }
});

document.addEventListener('dblclick', e => {
  const vp = document.getElementById('viewport');
  if (!vp || !vp.contains(e.target)) return;
  if (e.target.closest('.text-block')) return;
  resetZoom();
});

// ===== Touch zoom & pan =====
let touchState = null;

document.addEventListener('touchstart', e => {
  if (!readerState) return;
  const vp = document.getElementById('viewport');
  if (!vp || !vp.contains(e.target)) return;
  if (e.target.closest('.reader-topbar') || e.target.closest('.reader-bottom-bar')) return;

  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDragging = true;
    dragStartX = t.clientX - panX;
    dragStartY = t.clientY - panY;
    touchState = null;
  } else if (e.touches.length === 2) {
    isDragging = false;
    const t1 = e.touches[0], t2 = e.touches[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    touchState = {
      startDist: Math.hypot(dx, dy),
      startZoom: zoomLevel,
      startPanX: panX,
      startPanY: panY,
      cx: (t1.clientX + t2.clientX) / 2,
      cy: (t1.clientY + t2.clientY) / 2,
    };
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (!readerState) return;

  if (touchState && e.touches.length === 2) {
    const t1 = e.touches[0], t2 = e.touches[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const dist = Math.hypot(dx, dy);
    const scale = dist / touchState.startDist;
    const newZoom = Math.max(1, Math.min(5, touchState.startZoom * scale));
    const oldS = baseScale * touchState.startZoom;
    const newS = baseScale * newZoom;
    const imgX = (touchState.cx - touchState.startPanX) / oldS;
    const imgY = (touchState.cy - touchState.startPanY) / oldS;
    panX = touchState.cx - imgX * newS;
    panY = touchState.cy - imgY * newS;
    zoomLevel = newZoom;
    applyTransform();
    e.preventDefault();
  } else if (isDragging && e.touches.length === 1) {
    const t = e.touches[0];
    panX = t.clientX - dragStartX;
    panY = t.clientY - dragStartY;
    applyTransform();
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  touchState = null;
  if (isDragging) {
    isDragging = false;
    const vp = document.getElementById('viewport');
    if (vp) vp.classList.remove('grabbing');
  }
});
