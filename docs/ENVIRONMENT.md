# Development environment

- OS: Linux Mint 22.3 (Ubuntu-family), desktop display available.
- Python: 3.12.3; project venv at `.venv` (created with
  `--system-site-packages` so PyGObject is visible).
- Node: v24.22.2 (used only for tests).
- Runtime: Python standard library only.
- Optional native: pywebview 6.2.1, PyGObject 3.48.2, WebKitGTK 4.1 installed.
- Dev: fonttools with brotli, build, PyInstaller 6.x, Playwright Python.
- Browser test binaries: `.playwright-browsers/` (Chromium; gitignored).
- Font subsets generated from Noto Serif/Sans CJK via `tools/build_fonts.py`.
- tsshogi 2.3.4 vendored under `src/kisshogi/web/vendor/tsshogi`.
- No engine/weights are part of the project. Local engine tests used a Nagisa
  binary via local config or an environment variable; no path is committed.
- The sandbox's pywebview/WebKit fails with MESA/DRM; the native-parent watchdog
  falls back to browser after 15s. Do not treat that as a code failure without
  retesting on a real desktop.
