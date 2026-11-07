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
- Pause/resume freezes the clocks and engine turns without discarding the game.
- Hand trays on each player's right side (white top-left, black bottom-right);
  five-sided piece shape; board sized to fit the viewport at
  1280x800/1366x768/1600x900 without page scrolling.
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
- GitHub CI is green on Python 3.10/3.12 for Ubuntu and Windows, JavaScript, and
  wheel/sdist. `v0.1.0` was published with browser-fallback binaries.
- The release spec now bundles pywebview and prefers the native window. The
  Linux onefile is ~48 MB, uses the system WebKitGTK shared libraries, and was
  built and launched natively here; the browser remains the fallback.
- Screenshots in `docs/`.
- `window.__kisshogiDebug` is opt-in via the `?debug` query string.

## Test evidence

- `python -m unittest discover -s tests -v`: 32 tests, OK.
- `node --test tests/js/*.test.mjs`: 31 tests, OK. This includes pause/resume,
  and batch Ponder hit and miss paths with a mocked USI API.
- `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py`:
  9 checks, OK (layout/scroll, editor apply + inline validation, declaration,
  impasse, pause + theme + config path, analysis panel, options restart, batch
  Ponder, Quit).
- `python scripts/smoke.py dist/kisshogi`: OK.
- Released Linux artifact downloaded and smoke-tested from the GitHub release:
  OK. The Windows zip contains only `kisshogi.exe` plus the expected docs;
  neither archive contains engines, books, configs, or logs.
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
3. **Release**: `v0.1.1` packages the native-first binaries; `v0.1.0` remains
   the browser-fallback release. Linux needs system PyGObject + WebKitGTK 4.1;
   Windows needs the WebView2 runtime.

## Handoff

Read `HANDOFF.md` first. The repository is ready for a new session; no engine
or user config is tracked.
