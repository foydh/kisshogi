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
- `tests/ui/fake_engine.py` is the deterministic USI test double for browser
  checks; it needs an executable bit and a POSIX shebang.
- A local Nagisa engine was used only for manual/UI testing. Do not add its path
  to tracked files; use an environment variable or local config.
- The container's pywebview/WebKit fails due MESA/DRM; native launch falls back
  after a 15s watchdog. Test native on a real desktop.

## Quick commands

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
node --test tests/js/*.test.mjs
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py
python scripts/smoke.py dist/kisshogi
python -m kisshogi --browser
python -m kisshogi --no-browser --port 8765
```

The debug handle `window.__kisshogiDebug` exists only when the page is opened
with `?debug` (used by `scripts/ui_check.py`).

## Immediate next steps

1. Run the release workflow by pushing `v0.1.0`; inspect wheel, sdist and
   both binaries. See `RELEASE.md` for the packaging decision. `main` is
   already pushed to `foydh/kisshogi` and CI is green.
2. Decide whether to add a separate native Windows bundle (WebView2/pythonnet);
   the current onefile binaries intentionally use the browser fallback.
3. Validate the native pywebview window and the Windows binary on real
   desktops; this sandbox cannot do either.
4. Optional polish: refresh screenshots after the UI changes.

## Important constraints

- No ShogiHome code/assets; tsshogi is an independent MIT dependency.
- No engines/eval/book/config/logs in git or release artifacts.
- No absolute user paths in tracked files. Runtime config is outside the repo.
- Keep the UI KISS; avoid adding frameworks or a bundler.
