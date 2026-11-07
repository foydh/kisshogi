# Testing

## Automated

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
node --test tests/js/*.test.mjs
```

Current result: 32 Python tests and 32 JavaScript tests pass.

Coverage highlights:
- USI option (all types), info cp/mate/bound/PV, bestmove.
- Engine probe/start/ready/options/go/stop/Ponder, error paths.
- Server auth/Host/Origin, traversal, config, Shift_JIS encode, engine API.
- Config preservation of arbitrary engine options.
- No user absolute paths in tracked text files.
- Standard legal moves, promotion, checkmate, jishogi thresholds.
- Per-side byoyomi/increment clocks and formatting.
- Eval normalization/graph geometry.
- KIF/KI2/CSA and UTF-8/Shift_JIS fixtures.
- Locale key parity and HTML key/id checks.
- Batch Ponder state machine: hit, miss, stop/restart, and normal play against
  a mocked USI API (`tests/js/batch.test.mjs`).
- Pause/resume clock behavior and analysis moves while paused
  (`tests/js/game.test.mjs`).
- Theme validation and the `/api/info` config-path endpoint.

## Browser/UI

Playwright is not a project runtime dependency. In this environment Chromium is
already downloaded under `.playwright-browsers/` (gitignored). Run:

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py
# or a subset:
python scripts/ui_check.py --only jishogi --only batch
```

The script starts the real server with a temporary config and uses
`tests/ui/fake_engine.py`, a deterministic USI engine double that follows a
fixed legal opening and logs its protocol traffic. It opens the page with
`?debug` to reach `window.__kisshogiDebug`.

Covered checks:
- Layout at 1280x800, 1366x768, and 1600x900: no page scroll, board fits,
  hands sit on each player's right side, and pieces use the SVG shogi
  silhouette.
- Initial board (81 squares) and New game.
- Position editor apply; invalid positions show an inline reason and leave the
  game unchanged.
- 27-point entering-king declaration through the real dialog and result text.
- 24-point jishogi adjudication (impasse) through the real dialog.
- Pause/resume: the clock stops without resetting, moves are still allowed,
  and the button label toggles.
- Analysis mode: no running clock and moves are allowed on both sides.
- Settings: config path, theme switch (persisted), coordinates.
- Analysis: Analyze/Stop toggle, three lines, mini board, output kept after
  stop, and playing the best move onto the board.
- Engine options: probe, edit `Threads`, Restart (stop + start), applied
  options, persisted config, and received `setoption` traffic.
- Batch game with Ponder: result table, `go ponder`, and `ponderhit`.
- Quit: stopped overlay appears and no false "server not responding" toast.

These checks need a POSIX executable fake engine (Linux/macOS). The previous
manual Nagisa flows (43 options, PvE, KIF import, language switch, two-game
batch) are recorded in `PROGRESS.md`.

## Binary smoke

```bash
python scripts/smoke.py dist/kisshogi
```

The portable browser onefile is ~8.2 MB and serves `/api/health` and the
token-injected index. The native onefile is ~48 MB and is also checked with
`--no-browser` here; its window is verified manually/locally.

## Native release build

- Linux: `pyinstaller packaging/kisshogi.spec` with system PyGObject/WebKitGTK
  4.1. The checked-in spec uses a thin WebKit2 typelib hook and relies on the
  system `libwebkit2gtk`; the resulting onefile is ~48 MB and was launched
  natively here.
- Windows: the workflow installs `.[native]` (pywebview + pythonnet) and builds
  the same spec; WebView2 is required at runtime.
- `python scripts/smoke.py dist/kisshogi` still verifies the server with
  `--no-browser`, which is independent of the native window.

## Manual checks still recommended

- Native window close exits all processes on a real desktop.
- Windows binary and WebView2 runtime.
- Native window on a real Linux/Windows desktop. The launcher forces software
  OpenGL on Linux, which was verified in this container.
