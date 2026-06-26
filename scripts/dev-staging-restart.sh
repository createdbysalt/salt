#!/usr/bin/env bash
set -euo pipefail

# Restart Next.js on :3000 with staging Supabase + 1Password secrets.
# Usage: pnpm dev:staging:restart:op
# Shortcut trigger in chat: qrestart:staging

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stopping anything on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

if ! command -v op >/dev/null 2>&1; then
  echo "Error: 1Password CLI (op) not found. Install it or run: op signin"
  exit 1
fi

echo "Starting dev server (staging Supabase via .env.staging.1password)..."
exec pnpm dev:staging:op
