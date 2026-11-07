# Vendored tsshogi

- Package: `tsshogi`
- Version: `2.3.4`
- License: MIT (see `LICENSE`)
- Source: https://registry.npmjs.org/tsshogi/-/tsshogi-2.3.4.tgz
- Upstream: https://github.com/sunfish-shogi/tsshogi
- Contents: the unmodified `dist/esm` directory, used directly by the browser.

Update with:

```bash
bash tools/update_tsshogi.sh
```

The repository does not use npm at runtime or build time. The generated ESM
files are committed so a fresh checkout works without Node.
