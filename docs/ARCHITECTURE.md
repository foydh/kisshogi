# Architecture

## Runtime layout

```text
native child (pywebview) or browser
        │ HTTP + X-Kisshogi-Token
Python parent: ThreadingHTTPServer + static files + token
        │
EngineManager: black / white / analysis USI processes
```

The frontend owns the game state. The Python backend never interprets shogi
rules; it serves files, persists config, manages USI subprocesses, and encodes
Shift_JIS export text.

## Frontend modules

- `main.js` — wiring, UI events, lifecycle, polling.
- `shogi.js` — the only tsshogi adapter; legal moves, SFEN, jishogi helpers,
  editor validation.
- `game-controller.js` — Record, clocks, results, undo, branch truncation.
- `clock-controller.js` — per-side byoyomi/increment clock.
- `board-view.js` — DOM board/hands, highlights, coordinates.
- `engine-controller.js` — black/white engine turns and Ponder.
- `analysis-controller.js` — live MultiPV and full-game scan.
- `eval-store.js` / `graph-view.js` — evaluations and SVG graph.
- `batch-runner.js` — sequential EvE batch games, including per-role Ponder.
- `options-form.js` — dynamic all-USI-options form; Restart stops and starts
  the engine so saved options take effect.
- `position-editor.js` — local Position edit/apply with inline validation.
- `record-panel` logic lives in `main.js`; `kifu.js` handles formats/encoding.
- `dialogs.js`, `i18n.js`, `api.js` — UI helpers.

`window.__kisshogiDebug` exposes `game`, `engine`, and `config` only when the
page is opened with `?debug`. `scripts/ui_check.py` uses it; a normal launch
exposes no debug surface.

## Backend modules

- `cli.py` — argparse; native child (`--native-host URL`) or parent; heartbeat
  and native watchdog.
- `server.py` — routes and lifecycle:
  - `GET /api/health`, `/api/config`, `/api/engine/status`,
    `/api/engine/events`.
  - `POST` engine probe/start/stop/newgame/setoption/go/ponderhit/
    stop-thinking; `/api/encode`; heartbeat/pagehide/native-ready/quit.
  - Static files with token injection and CSP.
- `engine.py` — `EngineSession`, `EngineManager`, `probe_engine`; event buffer,
  state machine, options validation, onefile/frozen safe subprocess handling.
- `usi.py` — option/info/bestmove parsers.
- `config.py` — defaults, validation, atomic save, relative engine path
  resolution.

## Config

Stored outside the repo:
- Windows: `%APPDATA%\Kisshogi\config.json`
- Linux: `$XDG_CONFIG_HOME/kisshogi/config.json` or
  `~/.config/kisshogi/config.json`

Schema (abridged):

```json
{
  "version": 1,
  "language": "auto",
  "mode": "pvp",
  "engineSide": "white",
  "timeControl": {
    "black": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0},
    "white": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0}
  },
  "maxMoves": 512,
  "jishogiRule": "general27",
  "engines": {
    "black": {"path": "", "options": {}},
    "white": {"path": "", "options": {}},
    "analysis": {"path": "", "options": {}}
  },
  "analysis": {"multipv": 3, "scanMs": 500},
  "batch": {"games": 10, "swapColors": true, "startSfens": []},
  "ui": {"flip": false, "coordinates": true}
}
```

Options are strings, including `"true"`/`"false"` for check options. Relative
engine paths are resolved against the config directory; runtime config is never
packaged.

## USI flow

- Parent starts engine with `cwd` = engine directory and UTF-8 pipes.
- `usi` → options/name → `usiok`; configured options are validated against the
  declarations; `isready` → `readyok`.
- Normal search: `position ...` then `go btime ... wtime ... byoyomi ...` or
  `go ... binc ... winc ...`; events are polled by sequence number.
- Ponder: `go ponder`; on opponent move match `ponderhit`, otherwise `stop`.
  Ponder time does not count; clock arms on `ponderhit`. Batch games keep one
  pending ponder per role, so both engines may ponder while the opponent
  searches; a game end stops any remaining ponder.
- Black/White/Analysis sessions are independent. Analysis falls back to the
  White slot, then Black, when its path is empty.

## Lifecycle

- Native: parent starts HTTP server, launches `--native-host` child, waits up to
  15s for the page to call `/api/native-ready`; on failure kills child and opens
  browser. Closing native window exits child; parent shuts down.
- Browser: page calls `/api/heartbeat` every 5s; `pagehide` schedules a 5s
  shutdown; 120s without heartbeat also shuts down. Quit button calls
  `/api/quit`.
- `/api/health` and static files are unauthenticated for smoke tests; all
  mutable APIs require the random token and same-origin Host/Origin.
