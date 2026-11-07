# Testing

## Automated

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
node --test tests/js/*.test.mjs
```

Current result: 30 Python tests and 27 JavaScript tests pass.

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

## Browser/UI

Playwright is not a project runtime dependency. In this environment Chromium is
already downloaded under `.playwright-browsers/` (gitignored). Run:

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python <script>
```

Validated flows:
- Initial board (81 squares), New game, pawn move, move list.
- Language switch zh-CN; KIF import (8 moves).
- PvE with a local Nagisa engine; engine move and clocks.
- MultiPV analysis (3 lines).
- Ponder state and both hit/miss paths (after a cursor fix).
- USI options UI: 43 Nagisa options rendered.
- Batch EvE: 2 games, max-move draws, results table.
- Native fallback in the container after 15s; native window itself is not
  testable here due WebKit/MESA.

## Binary smoke

```bash
python scripts/smoke.py dist/kisshogi
```

The current Linux PyInstaller onefile is ~8.2 MB and serves `/api/health` and
the token-injected index. It is built without pywebview, so it uses the browser
fallback.

## Manual checks still recommended

- Native window close exits all processes on a real desktop.
- Jishogi declaration/impasse dialogs end-to-end.
- Position editor apply/cancel with a valid position.
- Engine option edit + restart.
- Windows binary.
