# Release

## Repository

- Target: `foydh/kisshogi`.
- Default branch: `main`.
- First release: `v0.1.0` (browser fallback).
- Current release: `v0.1.3` (native and portable variants).
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
git tag -a v0.1.3 -m "Kisshogi 0.1.3"
git push origin v0.1.3
```

`.github/workflows/release.yml` verifies the tag, builds wheel/sdist, builds
Linux and Windows onefile artifacts, runs smoke tests, creates checksums, and
publishes a GitHub release.

## Status

- `v0.1.3` is the only published release. Assets: wheel, sdist, and four
  binaries:
  - `linux-x86_64` native (~48 MB, 34 MB compressed)
  - `linux-x86_64-portable` browser-only (~8 MB, 6.7 MB compressed)
  - `windows-x86_64` native
  - `windows-x86_64-portable` browser-only
- The released Linux native and portable artifacts were downloaded and
  verified; the native window stayed up and the portable build correctly has
  no native window.
- Older releases `v0.1.0`, `v0.1.1` and `v0.1.2` and their tags were deleted.

## Packaging decision (0.1.3)

- `packaging/kisshogi.spec` includes pywebview and (on Linux) PyGObject/WebKit2
  typelib support. These native builds try the native window first and fall
  back to the browser if it cannot start.
- `packaging/kisshogi-portable.spec` excludes pywebview/GI for the
  `-portable` browser-only assets, built on older baseline runners.
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
