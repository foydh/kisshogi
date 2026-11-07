# Testing

## Automated

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
node --test tests/js/*.test.mjs
```

Current result: 30 Python tests and 29 JavaScript tests pass.

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
- Initial board (81 squares) and New game.
- Position editor apply; invalid positions show an inline reason and leave the
  game unchanged.
- 27-point entering-king declaration through the real dialog and result text.
- 24-point jishogi adjudication (impasse) through the real dialog.
- Engine options: probe, edit `Threads`, Restart (stop + start), applied
  options, persisted config, and received `setoption` traffic.
- Batch game with Ponder: result table, `go ponder`, and `ponderhit`.

These checks need a POSIX executable fake engine (Linux/macOS). The previous
manual Nagisa flows (43 options, PvE, analysis, KIF import, language switch,
two-game batch) are recorded in `PROGRESS.md`.

## Binary smoke

```bash
python scripts/smoke.py dist/kisshogi
```

The current Linux PyInstaller onefile is ~8.2 MB and serves `/api/health` and
the token-injected index. It is built without pywebview, so it uses the browser
fallback.

## Manual checks still recommended

- Native window close exits all processes on a real desktop.
- Windows binary.
- Native pywebview on real Linux/Windows desktops.
