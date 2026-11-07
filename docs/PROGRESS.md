# Implementation progress

Last updated: 2026-11-08 (Asia/Shanghai)

## Overall status

The core application is implemented and runnable. Automated Python and
JavaScript tests pass, and a tracked Playwright suite now covers the flows that
were previously only checked by hand: position editor apply/validation, both
jishogi dialogs, engine option restart, and batch games with Ponder.

## Completed

- Python package/layout, pyproject, wheel/sdist build.
- Local HTTP server with token, Host/Origin checks, CSP, path traversal guard.
- Browser lifecycle: heartbeat, `pagehide` 5s shutdown, 120s watchdog,
  explicit Quit.
- Native launcher via pywebview child process with readiness handshake and
  browser fallback. In this container WebKitGTK/MESA hangs, so the fallback was
  verified; native UI still needs testing on a normal desktop.
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
- KIF/KI2/CSA/SFEN import; UTF-8/Shift_JIS export via backend encode.
- Position editor with legality validation and an inline reason when Apply
  fails (no more toast-only feedback).
- Analysis panel: MultiPV, live info, full-game scan; SVG eval graph.
- Batch EvE: color swap, start SFEN cycling, summary, CSV.
- i18n en/zh-CN/ja; original CSS art; bundled Noto CJK subsets.
- CI workflows and PyInstaller spec; 8.2 MB Linux onefile smoke-tested.
- Screenshots in `docs/`.
- `window.__kisshogiDebug` is opt-in via the `?debug` query string.

## Test evidence

- `python -m unittest discover -s tests -v`: 30 tests, OK.
- `node --test tests/js/*.test.mjs`: 29 tests, OK. This includes batch Ponder
  hit and miss paths with a mocked USI API.
- `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py`:
  6 checks, OK (initial board, editor apply + inline validation, declaration,
  impasse, options restart, batch Ponder).
- `python scripts/smoke.py dist/kisshogi`: OK.
- Playwright UI checks use `tests/ui/fake_engine.py`, a deterministic USI test
  double that follows a fixed legal opening and logs protocol traffic.
- Native launch in this sandbox fails inside WebKit and falls back to browser
  after the 15-second readiness timeout. The parent/child watchdog works.

## Known gaps / next work

1. **Native release packaging**: the 0.1.0 binaries stay browser-fallback (see
   `RELEASE.md`). A separate Windows native bundle is the best candidate but
   needs WebView2/pythonnet packaging and testing on Windows.
2. **GitHub**: the local repository is on `main`; the remote
   `foydh/kisshogi` exists but was empty. Push, CI, tag, and release status
   must be checked after this session.
3. **Native pywebview** must be validated on a real Linux/Windows desktop; the
   sandbox's WebKit/MESA issue is environmental.
4. **Windows binary** has not been built here; CI will be the first run.
5. **Screenshots**: `docs/screenshot*.png` are originals; settings screenshot
   was removed because it contained a local engine path.

## Handoff

Read `HANDOFF.md` first. The repository is ready for a new session; no engine
or user config is tracked.
