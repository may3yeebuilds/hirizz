# Hirizz for Windows

Share `releases/Hirizz-Setup-0.3.0-x64.exe` with friends. The installer includes the app and runtime; Node.js, an API key, and a ChatGPT account are not required. Supports Windows 10/11 x64. The installer is unsigned, so Windows may display a publisher/reputation warning. Use a code-signing certificate before broad public distribution.

All resumes and application data stay in the app's Windows user profile, separately for each person. Scoring, tailoring, TXT downloads, and PDF export work without internet. Reading new job links needs internet and is subject to job board restrictions. The app retrieves postings directly; it does not depend on the private hosted site.

Use Export backup in the web app, then Import in the Windows app to transfer your workspace. These versions do not automatically synchronize. Export regularly; the installer preserves the app profile on uninstall, but backups are the recovery path if that profile is cleared.

Updates are manual in this first release: distribute a new installer with a higher version. Install it over the current app to retain the same profile. Automatic updates and code signing are not configured.

Developer build: from the repository root run `node scripts/prepare-desktop.mjs`, install the pinned dependencies in this directory, run `node desktop/node_modules/electron/install.js`, and run `node desktop/node_modules/electron-builder/cli.js --projectDir desktop --win nsis --x64 --publish never`. The lockfile pins packaging dependencies. Keep the standard Electron license and third-party notices bundled with the installer.
