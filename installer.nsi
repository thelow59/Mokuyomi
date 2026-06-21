!define PRODUCT_NAME "Mokuyomi"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "thelow59"
!define PRODUCT_WEB_SITE "https://github.com/thelow59/Mokuyomi"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Mokuyomi.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "dist\Mokuyomi-Setup.exe"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel admin

; Modern UI
!include "MUI2.nsh"
!include "FileFunc.nsh"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
Page custom AutostartPage AutostartPageLeave
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\start.vbs"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Mokuyomi now"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Custom autostart checkbox
Var AUTOSTART_CHECKBOX

Function AutostartPage
  !insertmacro MUI_HEADER_TEXT "Startup Options" "Choose whether Mokuyomi starts automatically"
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateCheckBox} 0 0 100% 12u "Start Mokuyomi when I log in"
  Pop $AUTOSTART_CHECKBOX
  nsDialogs::Show
FunctionEnd

Function AutostartPageLeave
  ${NSD_GetState} $AUTOSTART_CHECKBOX $0
  StrCpy $AUTOSTART_CHECKBOX $0
FunctionEnd

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer

  File "dist_pyinstaller\Mokuyomi.exe"
  File "start.vbs"

  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Mokuyomi.lnk" "$INSTDIR\Mokuyomi.exe"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Mokuyomi (background).lnk" "$INSTDIR\start.vbs"
  CreateShortCut "$DESKTOP\Mokuyomi.lnk" "$INSTDIR\Mokuyomi.exe"

  ; Create manga directory
  CreateDirectory "$INSTDIR\manga"
  FileOpen $0 "$INSTDIR\manga\readme.txt" w
  FileWrite $0 "Drop your manga folders here.$\r$\n"
  FileWrite $0 "Each series should have its .mokuro file and an image folder.$\r$\n"
  FileWrite $0 "See: https://github.com/thelow59/Mokuyomi"
  FileClose $0

  ; Create data directory in APPDATA for frozen EXE
  CreateDirectory "$APPDATA\Mokuyomi"

  ; Autostart via HKCU Run (use VBS to hide console)
  ${If} $AUTOSTART_CHECKBOX = 1
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mokuyomi" 'wscript.exe "$INSTDIR\start.vbs"'
  ${EndIf}

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninst.exe"

  ; Register in Add/Remove Programs
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
SectionEnd

Section Uninstall
  ; Remove files
  Delete "$INSTDIR\Mokuyomi.exe"
  Delete "$INSTDIR\start.vbs"
  Delete "$INSTDIR\uninst.exe"
  RMDir /r "$INSTDIR\manga"
  RMDir "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Mokuyomi.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\Mokuyomi.lnk"

  ; Remove autostart
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mokuyomi"

  ; Remove from Add/Remove Programs
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd
