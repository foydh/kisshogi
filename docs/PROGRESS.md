# Implementation progress

Last updated: 2026-11-08 (Asia/Shanghai)

## Overall status

The core application is implemented and runnable. Automated Python and
JavaScript tests pass, and a tracked Playwright suite covers the UI flows that
were previously hand-checked: board layout, editor apply/validation, both
jishogi dialogs, pause/resume, themes and config path, analysis, engine option
restart, batch games with Ponder, and the Quit flow.

## Completed

- Python package/layout, pyproject, wheel/sdist build.
- Local HTTP server with token, Host/Origin checks, CSP, path traversal guard.
- Browser lifecycle: heartbeat, `pagehide` 5s shutdown, 120s watchdog,
  explicit Quit.
- Native launcher via pywebview child process with readiness handshake and
  browser fallback. On Linux the child runs with software OpenGL by default;
  this made the native window start successfully in this container instead of
  hitting the old MESA/DRM hang.
- USI engine manager: handshake, options, probe, ready, go, stop, newgame,
  event polling, error/timeout handling.
- Three engine slots (Black/White/Analysis), independent sessions.
- All USI options UI (verified with Nagisa: 43 options rendered).
- Standard Ponder flow (verified hit and miss with Nagisa).
- Batch games with Ponder: each engine may ponder while the opponent searches;
  hits use `ponderhit`, misses stop the search and restart normally.
- Engine **Restart** now stops and starts the engine with the saved options and
  re-renders the option list; it is no longer a stop-only button.
- Per-side main time + byoyomi or increment; clocks, timeout, max moves.
- tsshogi adapter: legal moves, promotions, drops, checkmate, repetition,
  jishogi helpers, KIF/CSA import/export.
- Game controller: history, branch truncation, undo, resign, declaration,
  jishogi adjudication, max moves.
- Board/hands UI, promotion dialog, clocks, status, coordinates.
- Analysis mode is the default: no running clocks and free moves for study and
  kifu review. Pause/resume stops the clock but still allows moves.
- Hand trays on each player's right side (white top-left, black bottom-right);
  traditional shogi-piece silhouette; black king 玉 / white king 王; board sized
  to fit the viewport at 1280x800/1366x768/1600x900 without page scrolling.
- Four themes (classic, dark, green, paper), persisted in the local config.
- The settings panel shows the local config file path and can copy it.
- Quit shows a clean stopped overlay instead of a false "server not responding"
  toast after the server has already shut down.
- KIF/KI2/CSA/SFEN import; UTF-8/Shift_JIS export via backend encode.
- Position editor with legality validation and an inline reason when Apply
  fails (no more toast-only feedback).
- Analysis panel: MultiPV, live info, full-game scan; SVG eval graph.
- Analysis has one Analyze/Stop toggle, keeps the last output after stopping,
  renders the best move on a mini board, and can play that move onto the board.
- README files are user-facing only: development, test, and release-process
  sections were removed or moved to `docs/`.
- Batch EvE: color swap, start SFEN cycling, summary, CSV.
- i18n en/zh-CN/ja; original CSS art; bundled Noto CJK subsets.
- CI workflows and PyInstaller spec.
- GitHub CI is green on Python 3.10/3.12 for Ubuntu and Windows, JavaScript,
  wheel/sdist, and native PyInstaller packages on Ubuntu 24.04 and Windows.
- The release spec bundles pywebview and prefers the native window. The Linux
  onefile is ~48 MB, uses the system WebKitGTK shared libraries, and was built
  and launched natively here; the browser remains the fallback.
- `v0.1.2` is the published native-first release (Linux built on Ubuntu
  24.04, Windows with WebView2). `v0.1.1` on Linux bundled an older GLib that
  conflicted with system WebKitGTK 4.1 and is superseded.
- `v0.1.3` adds the Analysis mode, the corrected piece/king rendering, and
  `-portable` browser-only artifacts alongside the native ones.
- Screenshots in `docs/`.
- `window.__kisshogiDebug` is opt-in via the `?debug` query string.

## Test evidence

- `python -m unittest discover -s tests -v`: 32 tests, OK.
- `node --test tests/js/*.test.mjs`: 32 tests, OK. This includes pause/resume,
  analysis mode, and batch Ponder hit and miss paths with a mocked USI API.
- `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py`:
  10 checks, OK (layout/scroll, editor apply + inline validation, declaration,
  impasse, pause + theme + config path, analysis mode, analysis panel, options
  restart, batch Ponder, Quit).
- `python scripts/smoke.py dist/kisshogi`: OK.
- `v0.1.2` released Linux artifact downloaded: server smoke OK and the native
  window stayed up (software OpenGL). The 34 MB tar.gz and 13 MB Windows zip
  contain only the binary plus the expected docs; neither archive contains
  engines, books, configs, or logs.
- Playwright UI checks use `tests/ui/fake_engine.py`, a deterministic USI test
  double that follows a fixed legal opening and logs protocol traffic.
- Native launch in this container stays up with software OpenGL enabled by the
  launcher; the readiness handshake works. A real desktop still needs a manual
  window-close check.

## Known gaps / next work

1. **Native pywebview** window close should still be checked on a real
   Linux/Windows desktop.
2. **Windows binary** is built by CI and packaged with pywebview/pythonnet, but
   has not been launched on Windows here.
3. **Release**: `v0.1.2` packages the native-first binaries; `v0.1.0`
   remains the browser-fallback release. Linux needs system PyGObject +
   WebKitGTK 4.1 and glibc 2.39+ (Ubuntu 24.04 build); Windows needs the
   WebView2 runtime.

## Handoff

Read `HANDOFF.md` first. The repository is ready for a new session; no engine
or user config is tracked.
