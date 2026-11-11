#!/usr/bin/env bash
# Starts the Avi.js API (http://localhost:3001) and the admin UI (http://localhost:3000).
set -euo pipefail
cd "$(dirname "$0")"

# Clear Vite's dependency cache first, so a stale pre-bundle never survives a restart.
rm -rf web/node_modules/.vite web/node_modules/.cache/vite

npx concurrently -k -n api,web -c blue,magenta \
  "npm run dev:api" \
  "npm --prefix web run dev"
