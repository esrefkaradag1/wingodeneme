#!/bin/sh
set -u

baseline() {
  echo "Mevcut veritabani baseline ediliyor"
  for dir in prisma/migrations/*/; do
    name=$(basename "$dir")
    if npx prisma migrate resolve --applied "$name"; then
      continue
    fi
    npx prisma migrate resolve --rolled-back "$name" || true
    npx prisma migrate resolve --applied "$name" || true
  done
}

if output=$(npx prisma migrate deploy 2>&1); then
  printf '%s\n' "$output"
else
  printf '%s\n' "$output"
  printf '%s\n' "$output" | grep -qE 'P3005|P3009' || exit 1
  baseline
  npx prisma migrate deploy
fi

exec node dist/src/server.js
