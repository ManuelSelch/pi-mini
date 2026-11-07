#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

case "$(uname -m)" in
  arm64) arch=arm64; checksum=679ad4966339e4ef4900f57996714864e4211b898825bb840c3086c419fbcef2 ;;
  x86_64) arch=x64; checksum=07b13722d558790fca20bb1ecf61bde24b7a4863111f7be77fc57251a407359a ;;
  *) echo 'Unsupported macOS architecture' >&2; exit 1 ;;
esac
[ "$(uname -s)" = Darwin ] || { echo 'A macOS host is required' >&2; exit 1; }
version=22.22.1
archive="node-v${version}-darwin-${arch}.tar.gz"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://nodejs.org/dist/v${version}/${archive}" -o "$tmp/$archive"
printf '%s  %s\n' "$checksum" "$tmp/$archive" | shasum -a 256 -c -
tar -xzf "$tmp/$archive" -C "$tmp"
cp package.json package-lock.json "$tmp/"
(cd "$tmp" && npm ci --omit=dev --ignore-scripts)
rm -rf bundle-resources
mkdir -p bundle-resources/backend
cp "$tmp/node-v${version}-darwin-${arch}/bin/node" bundle-resources/backend/node
cp "$tmp/node-v${version}-darwin-${arch}/LICENSE" bundle-resources/backend/NODE-LICENSE
cp dist-host/main.mjs bundle-resources/backend/main.mjs
cp -R "$tmp/node_modules" bundle-resources/backend/node_modules
