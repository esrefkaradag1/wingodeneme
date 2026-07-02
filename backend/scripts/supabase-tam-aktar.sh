#!/usr/bin/env bash
# =============================================================================
# WingoSınav — Tüm veritabanını (public şema: şema + veri) Supabase'e aktarır.
#
# Gereksinim: PostgreSQL istemci araçları (pg_dump, psql)
#   macOS: brew install libpq && echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
#
# Supabase bağlantısı: SQL Editor ile import edecekseniz büyük dosyada zaman aşımı olabilir;
# tercihen terminalden psql kullanın. Pooler (6543) yerine doğrudan 5432 "Session" / direct
# connection string kullanmak restore için daha güvenlidir.
#
# Kullanım:
#   export KAYNAK_DATABASE_URL="postgresql://user:pass@host:5432/wingo_db"
#   export SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-...pooler.supabase.com:5432/postgres?sslmode=require"
#   ./backend/scripts/supabase-tam-aktar.sh dump          # sadece SQL dosyası üret
#   ./backend/scripts/supabase-tam-aktar.sh restore       # dump + hedefe yükle (onay ister)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_FILE="${OUT_FILE:-$BACKEND_DIR/prisma/wingo_tam_yedek_$(date +%Y%m%d_%H%M%S).sql}"

KAYNAK="${KAYNAK_DATABASE_URL:-${SOURCE_DATABASE_URL:-}}"
HEDEF="${SUPABASE_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"

dump_only() {
  if [[ -z "$KAYNAK" ]]; then
    echo "Hata: KAYNAK_DATABASE_URL (veya SOURCE_DATABASE_URL) tanımlı değil."
    echo "Örnek: export KAYNAK_DATABASE_URL='postgresql://...'"
    exit 1
  fi
  echo "→ Kaynak: $KAYNAK"
  echo "→ Çıktı: $OUT_FILE"
  pg_dump "$KAYNAK" \
    --schema=public \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$OUT_FILE"
  echo ""
  echo "Tamam. Dosya boyutu: $(du -h "$OUT_FILE" | cut -f1)"
  echo ""
  echo "Supabase SQL Editor: dosyayı açıp yapıştırabilirsin (küçük/orta boyutlarda)."
  echo "Terminal ile yükleme:"
  echo "  psql \"\$SUPABASE_DATABASE_URL\" -v ON_ERROR_STOP=1 -f \"$OUT_FILE\""
}

restore() {
  if [[ -z "$KAYNAK" ]]; then
    echo "Hata: KAYNAK_DATABASE_URL gerekli."
    exit 1
  fi
  if [[ -z "$HEDEF" ]]; then
    echo "Hata: SUPABASE_DATABASE_URL (veya TARGET_DATABASE_URL) gerekli."
    exit 1
  fi
  dump_only
  echo ""
  read -r -p "Hedef Supabase veritabanına şimdi yazılsın mı? (y/N) " onay
  if [[ ! "${onay,,}" =~ ^y ]]; then
    echo "İptal. SQL dosyası korundu: $OUT_FILE"
    exit 0
  fi
  psql "$HEDEF" -v ON_ERROR_STOP=1 -f "$OUT_FILE"
  echo "Restore tamam."
}

case "${1:-}" in
  dump)
    dump_only
    ;;
  restore)
    restore
    ;;
  *)
    echo "Kullanım: $0 dump | restore"
    echo ""
    echo "Ortam değişkenleri:"
    echo "  KAYNAK_DATABASE_URL   Mevcut Postgres (Docker/yerel)"
    echo "  SUPABASE_DATABASE_URL Supabase bağlantı cümlesi (?sslmode=require ekli olsun)"
    exit 1
    ;;
esac
