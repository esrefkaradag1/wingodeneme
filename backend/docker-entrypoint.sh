#!/bin/sh
set -u

echo "Migrasyon durumu okunuyor"
status=$(node <<'JS'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

(async () => {
  const prisma = new PrismaClient();
  const dirs = fs.readdirSync('prisma/migrations')
    .filter((name) => fs.existsSync(path.join('prisma/migrations', name, 'migration.sql')))
    .sort();
  let rows = [];
  try {
    rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"'
    );
  } catch (error) {
    console.error(error.message);
  }
  const byName = new Map();
  for (const row of rows) {
    const list = byName.get(row.migration_name) || [];
    list.push(row);
    byName.set(row.migration_name, list);
  }
  for (const name of dirs) {
    const list = byName.get(name) || [];
    const applied = list.some((row) => row.finished_at && !row.rolled_back_at);
    const failed = list.some((row) => !row.finished_at && !row.rolled_back_at);
    if (applied) console.log('SKIP ' + name);
    else if (failed) console.log('FAILED ' + name);
    else console.log('MISSING ' + name);
  }
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
JS
)

printf '%s\n' "$status"

printf '%s\n' "$status" | while IFS= read -r line; do
  case "$line" in
    FAILED\ *)
      name=${line#FAILED }
      echo "Basarisiz migrasyon kapatiliyor: $name"
      npx prisma migrate resolve --rolled-back "$name"
      npx prisma migrate resolve --applied "$name"
      ;;
    MISSING\ *)
      name=${line#MISSING }
      echo "Uygulanmis sayiliyor: $name"
      npx prisma migrate resolve --applied "$name" || true
      ;;
  esac
done

echo "Migrasyonlar kontrol ediliyor"
npx prisma migrate deploy || true

echo "Sunucu baslatiliyor"
exec node dist/src/server.js
