#!/bin/sh
set -e

echo "[boot] applying database migrations…"
./node_modules/.bin/prisma migrate deploy

echo "[boot] running bootstrap seed…"
node prisma/seed.mjs

echo "[boot] starting Next.js…"
exec ./node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
