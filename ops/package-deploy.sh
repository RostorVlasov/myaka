#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_DIR"

test -s dist/client/index.html
test -s dist/client/robots.txt
test -s dist/client/sitemap.xml
command -v zip >/dev/null

rm -rf deploy
rm -f deploy.zip
mkdir -p deploy/dist deploy/ops
cp -a dist/client deploy/dist/
cp server.ts ecosystem.config.cjs .env.example deploy/
cp ops/deploy-server.sh ops/configure-nginx.sh deploy/ops/

cat > deploy/package.json <<'JSON'
{
  "name": "myaka",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.4.2",
  "scripts": { "start": "bun server.ts" }
}
JSON

zip -qr deploy.zip deploy
du -h deploy.zip
