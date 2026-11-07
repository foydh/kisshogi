#!/usr/bin/env bash
set -euo pipefail
VERSION="${TSHOGI_VERSION:-2.3.4}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/src/kisshogi/web/vendor/tsshogi"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
URL="https://registry.npmjs.org/tsshogi/-/tsshogi-${VERSION}.tgz"
echo "Downloading $URL"
curl -fsSL "$URL" -o "$TMP/tsshogi.tgz"
mkdir -p "$TMP/pkg"
tar -xzf "$TMP/tsshogi.tgz" -C "$TMP/pkg"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -a "$TMP/pkg/package/dist/esm/." "$TARGET/"
cp "$TMP/pkg/package/LICENSE" "$TARGET/LICENSE"
cat > "$TARGET/VENDOR.md" <<EOF
# Vendored tsshogi

- Package: \`tsshogi\`
- Version: \`${VERSION}\`
- License: MIT (see \`LICENSE\`)
- Source: ${URL}
- Upstream: https://github.com/sunfish-shogi/tsshogi
- Contents: the unmodified \`dist/esm\` directory, used directly by the browser.

Update with \`bash tools/update_tsshogi.sh\`.
EOF
echo "Updated tsshogi in $TARGET"
