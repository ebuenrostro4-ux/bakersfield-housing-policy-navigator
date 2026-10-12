#!/bin/bash
set -euo pipefail
navigator_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$navigator_dir"
if command -v node >/dev/null 2>&1; then
  navigator_node="$(command -v node)"
else
  navigator_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$navigator_node" ]; then
  echo 'Please install Node.js 22.12 or newer, then open this launcher again.'
  read -r -p 'Press Return to close.'
  exit 1
fi
export PATH="$(dirname "$navigator_node"):$PATH"
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -d node_modules/next ]; then
  if command -v npm >/dev/null 2>&1; then npm install
  else
    navigator_pnpm="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm"
    if [ ! -x "$navigator_pnpm" ]; then
      echo 'Install dependencies with npm install. See README.md.'
      read -r -p 'Press Return to close.'
      exit 1
    fi
    "$navigator_pnpm" install
  fi
fi
if /usr/sbin/lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo 'Port 3000 is already in use. Navigator may already be running.'
  echo 'Check http://127.0.0.1:3000 in your browser, or stop the existing server first.'
  read -r -p 'Press Return to close.'
  exit 0
fi
"$navigator_node" scripts/prepare-db.mjs
"$navigator_node" node_modules/prisma/build/index.js generate
"$navigator_node" node_modules/prisma/build/index.js db push --skip-generate
"$navigator_node" --import tsx prisma/seed.ts
printf '\nNavigator is starting. Open http://127.0.0.1:3000\n'
printf 'Choose Planner, Reviewer, or Administrator to explore the demo.\n'
printf 'Keep this window open. Press Control-C to stop the app.\n\n'
exec "$navigator_node" node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3000
