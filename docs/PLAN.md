# Kisshogi project plan

## Goal

A small, KISS shogi GUI for Windows and Linux, suitable for local play and USI
engine testing. No Electron, frontend framework, database, WebSocket, or
runtime npm.

Default UI is a native pywebview window when available; the system browser is
the fallback. Closing the native window exits the process. In browser mode the
page notifies the backend on exit and a heartbeat is a last-resort watchdog.

## Confirmed decisions

- Repository: `foydh/kisshogi`; code MIT; author foydh.
- Rules/SFEN/KIF/CSA: independent MIT library tsshogi 2.3.4, vendored under
  `src/kisshogi/web/vendor/tsshogi`. No ShogiHome GUI code or assets are copied.
- Python 3.10+; runtime standard library only.
- Optional native extra: pywebview.
- Three independent engine slots: Black, White, Analysis.
- Every USI option is exposed through a dynamic form. `USI_Ponder` is used for
  standard `go ponder` / `ponderhit` / `stop` flow.
- Per-side time settings. Each side chooses byoyomi or Fischer increment.
- Pause/resume freezes clocks and engine turns without resetting the game.
- Engine-vs-engine + batch games (color swap, start-SFEN cycling, CSV).
- 24/27-point entering-king declaration and 24-point jishogi adjudication.
- KIF/KI2/CSA import; KIF/KI2/CSA/SFEN export; UTF-8 and Shift_JIS output.
- Position editor; evaluation graph; full-game analysis. Analysis keeps its last
  lines, shows the best move on a mini board, and can play it on the board.
- Hand trays on each player's right (white left, black right); four themes;
  board fitted to the viewport.
- The local config file path is shown in Settings.
- Maximum moves configurable; 0 = unlimited.
- No real engines, eval files, books, configs, logs, or absolute user paths in
  the repository or release artifacts.

## Main modules

- `src/kisshogi/cli.py` — CLI, native child-process launcher, browser fallback.
- `src/kisshogi/server.py` — local HTTP API, token/auth, static assets,
  heartbeat/pagehide/quit lifecycle.
- `src/kisshogi/engine.py` — USI subprocess manager and event buffer.
- `src/kisshogi/usi.py` — USI option/info/bestmove parsers.
- `src/kisshogi/config.py` — cross-platform local config, validation, relative
  engine path resolution.
- `src/kisshogi/web/js/` — frontend controllers and views.
- `src/kisshogi/web/vendor/tsshogi/` — vendored rules/format library.
- `src/kisshogi/web/assets/` — original logo and Noto CJK font subsets.

## Feature acceptance

1. PvP/PvE/EvE, different engines per side, clocks, timeout, resignation.
2. Ponder, all USI options, engine analysis, full-game scan, eval graph.
3. KIF/KI2/CSA input and dual-encoding export.
4. Position editor.
5. Entering-king declaration and jishogi adjudication.
6. Batch play with CSV.
7. Chinese/English/Japanese UI.
8. Linux/Windows CI and tagged GitHub release.
9. No engine/config/absolute path in artifacts.

## Release plan

Tag `v0.1.0` triggers `.github/workflows/release.yml`, which builds wheel,
sdist, Linux tar.gz and Windows zip, creates checksums, and publishes a GitHub
release. See `RELEASE.md` for current caveats.
