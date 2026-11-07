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
- On Linux the native child gets `LIBGL_ALWAYS_SOFTWARE=1` and
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` by default. Native launch works in this
  container with those defaults; a real desktop should still be checked for
  window-close behavior.

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

1. `main` contains post-`v0.1.0` UI improvements. Tag `v0.1.1` (after CI)
   if a new release is wanted; the release workflow is unchanged.
2. Decide whether to add a separate native Windows bundle (WebView2/pythonnet);
   the current onefile binaries intentionally use the browser fallback.
3. Validate the native window close behavior and the Windows binary on real
   desktops.

## Important constraints

- No ShogiHome code/assets; tsshogi is an independent MIT dependency.
- No engines/eval/book/config/logs in git or release artifacts.
- No absolute user paths in tracked files. Runtime config is outside the repo.
- Keep the UI KISS; avoid adding frameworks or a bundler.
