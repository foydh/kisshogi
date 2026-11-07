# New-session handoff

## Read first

1. `docs/PROGRESS.md` — current state, test evidence, known gaps.
2. `docs/PLAN.md` — scope and design decisions.
3. `docs/ARCHITECTURE.md` — module/API map.
4. `docs/TESTING.md` — commands and browser test setup.
5. `AGENTS.md` — project rules.

## Environment

- Project root is the directory containing `pyproject.toml`.
- Use `.venv` for all pip work; never system pip.
- `.venv` was created with `--system-site-packages` so PyGObject is visible.
- Native extra and dev tools are installed in `.venv`.
- Playwright Chromium is under `.playwright-browsers/` and is gitignored.
- A local Nagisa engine was used only for manual/UI testing. Do not add its path
  to tracked files; use an environment variable or local config.
- The container's pywebview/WebKit fails due MESA/DRM; native launch falls back
  after a 15s watchdog. Test native on a real desktop.

## Quick commands

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
node --test tests/js/*.test.mjs
python scripts/smoke.py dist/kisshogi
python -m kisshogi --browser
python -m kisshogi --no-browser --port 8765
```

## Immediate next steps

1. Initialize git (`main`), add/commit with local author identity, create
   `foydh/kisshogi`, push, verify CI.
2. Run the release workflow by pushing `v0.1.0`; inspect wheel, sdist and both
   binaries.
3. Decide native release packaging (Windows native is the best candidate).
4. Add batch Ponder if required.
5. Add Playwright tests for jishogi UI, editor apply, and options restart.
6. Remove/gate `window.__kisshogiDebug`.

## Important constraints

- No ShogiHome code/assets; tsshogi is an independent MIT dependency.
- No engines/eval/book/config/logs in git or release artifacts.
- No absolute user paths in tracked files. Runtime config is outside the repo.
- Keep the UI KISS; avoid adding frameworks or a bundler.
