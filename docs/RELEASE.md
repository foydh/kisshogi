# Release

## Repository

- Target: `foydh/kisshogi`.
- Default branch: `main`.
- Tag for the first release: `v0.1.0`.

## Git setup (local only)

Use the owner-provided git name/email in the local repository config; do not
commit credentials. The repository `.git/config` is not tracked.

```bash
git init -b main
git add .
git commit -m "feat: initial Kisshogi 0.1.0"
git remote add origin git@github.com:foydh/kisshogi.git
git push -u origin main
```

## Release

```bash
git tag -a v0.1.0 -m "Kisshogi 0.1.0"
git push origin v0.1.0
```

`.github/workflows/release.yml` verifies the tag, builds wheel/sdist, builds
Linux and Windows onefile artifacts, runs smoke tests, creates checksums, and
publishes a GitHub release.

## Packaging decision (0.1.0)

- The PyInstaller spec excludes pywebview/GI/PIL to keep one cross-platform
  binary small and portable. Release binaries therefore use the browser
  fallback; this is the chosen 0.1.0 behavior, not a build accident.
- A native window is available when installing from source with the `native`
  extra and the platform dependencies.
- A separate **native Windows bundle** is the best candidate for the first
  native release. It needs WebView2 plus pythonnet/clr packaging and must be
  built and tested on Windows; adding it blind to the current workflow would
  not be verifiable from this environment.
- Windows packaging has not been executed in this environment; CI will be the
  first Windows build.
- No code signing; Windows SmartScreen may warn.
- No engine, config, log, or absolute path is included in artifacts.
