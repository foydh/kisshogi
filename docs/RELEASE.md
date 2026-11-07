# Release

## Repository

- Target: `foydh/kisshogi`.
- Default branch: `main`.
- First release: `v0.1.0` (browser fallback).
- Current release: `v0.1.2` (native window first, browser fallback).
- `v0.1.1` tried native-first but its Linux build bundled an older GLib that
  conflicted with system WebKitGTK; use `v0.1.2` on Linux.

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
git tag -a v0.1.2 -m "Kisshogi 0.1.2"
git push origin v0.1.2
```

`.github/workflows/release.yml` verifies the tag, builds wheel/sdist, builds
Linux and Windows onefile artifacts, runs smoke tests, creates checksums, and
publishes a GitHub release.

## Status

- `v0.1.0` was published on 2026-11-08 with browser-fallback binaries.
- `v0.1.1` was a failed native-first attempt on Linux (bundled GLib/WebKit
  mismatch); it is superseded by `v0.1.2`.
- `v0.1.2` is built on Ubuntu 24.04 so the bundled GLib/Gtk libraries match
  WebKitGTK 4.1. The Linux artifact is about 48 MB (34 MB compressed) and the
  Windows zip is about 13 MB; both include pywebview and use the native window
  first. The released Linux binary was smoke-tested and launched natively.

## Packaging decision (0.1.2)

- The PyInstaller spec includes pywebview and (on Linux) PyGObject/WebKit2
  typelib support. Both binaries try the native window first and fall back to
  the browser if it cannot start.
- **Linux**: the binary bundles the GI/Gtk runtime pieces but deliberately uses
  the system `libwebkit2gtk` shared libraries. Bundling WebKitGTK produced a
  400+ MB onefile tied to one distribution's library set. A source install and
  the release binary therefore both need PyGObject + WebKitGTK 4.1.
- The Linux binary is built on Ubuntu 24.04 and needs glibc 2.39+; older
  distributions should install from source. Building on 22.04 was tried and
  rejected because its older bundled GLib broke system WebKitGTK 4.1.
- The launcher forces software OpenGL on Linux (`LIBGL_ALWAYS_SOFTWARE=1`), so
  VMs and remote desktops work without a GPU.
- **Windows**: pywebview + pythonnet are bundled; the WebView2 runtime is
  required (present on most Windows 10/11 systems).
- No code signing; Windows SmartScreen may warn.
- No engine, config, log, or absolute path is included in artifacts.
