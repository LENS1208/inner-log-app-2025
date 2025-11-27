#!/bin/bash

# Supabaseデータベースバックアップスクリプト
# 使い方: bash scripts/backup-database.sh

# .envファイルから環境変数を読み込む
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Supabaseデータベースをバックアップ中..."

# 主要テーブルをJSONでエクスポート
tables=(
  "trades"
  "daily_notes"
  "trade_notes"
  "ai_proposals"
  "account_transactions"
  "account_summary"
  "user_settings"
  "import_history"
  "coaching_jobs"
)

for table in "${tables[@]}"; do
  echo "  - $table をエクスポート中..."

  # Supabase REST APIでデータを取得（サービスロールキーを使用）
  API_KEY="${VITE_SUPABASE_SERVICE_ROLE_KEY:-$VITE_SUPABASE_ANON_KEY}"

  curl -s \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    "$VITE_SUPABASE_URL/rest/v1/$table?select=*" \
    > "$BACKUP_DIR/$table.json"

  # バックアップサイズを確認
  SIZE=$(wc -c < "$BACKUP_DIR/$table.json")
  if [ "$SIZE" -gt 2 ]; then
    echo "    ✓ $table: $SIZE bytes"
  else
    echo "    ⚠ $table: データなし (RLS制限の可能性)"
  fi
done

echo "✅ バックアップ完了: $BACKUP_DIR"
echo ""
echo "復元方法:"
echo "  node scripts/restore-database.js $BACKUP_DIR"
