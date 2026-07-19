#!/bin/sh
set -e

# DATABASE_URL now points at Neon Postgres (see .env.example). `db push` is
# idempotent — it only applies schema differences, so it's safe to run on
# every boot rather than trying to detect "first boot" like the old
# SQLite-file check did.
echo "Syncing Prisma schema to Neon..."
npx prisma db push --skip-generate
echo "Schema synced. Run 'npm run db:seed' once against a fresh database if you haven't already (see DEPLOYMENT.md)."

exec node server.js
