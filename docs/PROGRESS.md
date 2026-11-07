# Implementation progress

Last updated: 2026-11-08 (Asia/Shanghai)

## Overall status

The core application is implemented and runnable. Automated Python and
JavaScript tests pass. Real-engine UI flows were exercised with a local
Nagisa USI engine: PvE, analysis, Ponder hit/miss, USI options, KIF import, and
a two-game EvE batch.

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
- Per-side main time + byoyomi or increment; clocks, timeout, max moves.
- tsshogi adapter: legal moves, promotions, drops, checkmate, repetition,
  jishogi helpers, KIF/CSA import/export.
- Game controller: history, branch truncation, undo, resign, declaration,
  jishogi adjudication, max moves.
- Board/hands UI, promotion dialog, clocks, status, coordinates.
- KIF/KI2/CSA/SFEN import; UTF-8/Shift_JIS export via backend encode.
- Position editor with legality validation.
- Analysis panel: MultiPV, live info, full-game scan; SVG eval graph.
- Batch EvE: color swap, start SFEN cycling, summary, CSV.
- i18n en/zh-CN/ja; original CSS art; bundled Noto CJK subsets.
- CI workflows and PyInstaller spec; 8.2 MB Linux onefile smoke-tested.
- Screenshots in `docs/`.

## Test evidence

- `python -m unittest discover -s tests -v`: 30 tests, OK.
- `node --test tests/js/*.test.mjs`: 27 tests, OK.
- `python scripts/smoke.py dist/kisshogi`: OK.
- Playwright UI checks: 81 board squares, move/undo, KIF import, language
  switch, PvE with Nagisa, analysis 3 lines, Ponder, 2-game batch, 43 USI
  option rows. No page errors in successful runs.
- Native launch in this sandbox fails inside WebKit and falls back to browser
  after the 15-second readiness timeout. The parent/child watchdog works.

## Known gaps / next work

1. **Native release packaging**: release binaries are browser-fallback because
   pywebview is excluded from PyInstaller. Source installs with `[native]` use
   the native window. Decide whether to add a platform-specific native bundle.
2. **Batch Ponder**: batch games currently drive engines without ponder. Single
   PvE/EvE games support Ponder.
3. **Jishogi UI**: logic is tested; the declaration/impasse dialogs have not
   been exercised end-to-end through Playwright.
4. **Editor UX**: applying an extra pawn correctly fails validation; add a
   friendlier inline explanation and more UI tests.
5. **Options UI**: probe/render tested; changing options and restarting the
   engine through the UI should get an end-to-end test.
6. **GitHub**: repository is not initialized/pushed yet. Workflows have not run
   on GitHub. Tag and release are pending.
7. **Windows**: PyInstaller spec is written but not executed on Windows here.
8. **Native pywebview** must be validated on a real Linux/Windows desktop; the
   sandbox's WebKit/MESA issue is environmental.
9. **`window.__kisshogiDebug`**: temporary local debug hook exposes game/engine
   internals. Remove or gate behind a `?debug` query before a public release.
10. **Docs screenshots**: `docs/screenshot*.png` are originals; settings
    screenshot was removed because it contained a local engine path.

## Handoff

Read `HANDOFF.md` first. The repository is ready for a new session; no engine
or user config is tracked.
