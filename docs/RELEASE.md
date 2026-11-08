# Release

## Repository

- Target: `foydh/kisshogi`.
- Default branch: `main`.
- Stable releases: `v1.0.0`, `v1.0.1`. Formal releases are kept, not deleted.
- All pre-1.0 releases and tags (`v0.1.0`-`v0.1.3`) were removed.

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
git tag -a v1.0.1 -m "Kisshogi 1.0.1"
git push origin v1.0.1
```

`.github/workflows/release.yml` verifies the tag, builds wheel/sdist, builds
Linux and Windows onefile artifacts, runs smoke tests, creates checksums, and
publishes a GitHub release.

## Status

- `v1.0.1` is the current release (theme naming/default, export hint).
- `v1.0.0` is kept as the first formal release.
- Both ship wheel, sdist, and four binaries:
  - `linux-x86_64` native (~48 MB, 34 MB compressed)
  - `linux-x86_64-portable` browser-only (~8 MB, 6.7 MB compressed)
  - `windows-x86_64` native
  - `windows-x86_64-portable` browser-only
- The released Linux native and portable artifacts for v1.0.0 were downloaded
  and verified; the v1.0.1 build uses the same packaging.

## Packaging decision (1.0.0)

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
