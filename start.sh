#!/bin/sh
set -e

echo "🌱 Seeding database..."
if ! bun run scripts/seed.ts; then
  echo "❌ Seeding failed. Check DB_PATH (current value: ${DB_PATH:-<unset, defaults to game.db in cwd>})" >&2
  exit 1
fi

echo "🚀 Starting server..."
exec bun run src/index.ts
