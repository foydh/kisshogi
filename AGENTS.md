# Agent notes

Read `docs/HANDOFF.md` and `docs/PROGRESS.md` before continuing.

- Use `.venv` for every pip command. Never install into the system Python.
- Keep the project KISS: no frontend framework, bundler, database, WebSocket,
  Electron, or runtime npm dependency.
- Do not copy ShogiHome code or assets. `tsshogi` is an independent MIT
  dependency; keep it isolated behind `src/kisshogi/web/js/shogi.js`.
- Never commit engines, evaluation files, books, user configs, logs, or
  absolute user paths. Engine paths live only in the local config outside the
  repository.
- Run `python -m unittest discover -s tests -v` and `node --test tests/js/*.test.mjs`.
- The release binaries are built by `.github/workflows/release.yml`.
