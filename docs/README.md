# ドキュメント構成

## 📚 有効なドキュメント

### `/docs/DATABASE_RULES.md` ⭐ 最重要
**データベース管理の唯一の正式ルール**

- マイグレーションの作成ルール
- デモデータの管理方法
- テストユーザーの定義
- セキュリティルール
- 本番環境とテスト環境の同一性

**このドキュメントが全ての基準です。**

### `/docs/DEMO_DATA_MANAGEMENT.md` ⭐ デモデータ担当者必読
**デモデータのみを更新する場合の実践ガイド**

- デモデータ更新の手順
- CSVファイルの編集方法
- データ検証の方法
- よくある失敗パターン
- 緊急時の対応

**マイグレーションを変更せずにデモデータのみを更新するための完全ガイド**

### `/docs/HOW_TO_REQUEST_DATABASE_CHANGES.md` 📝 リクエスト担当者必読
**AIアシスタントにデータベース変更を依頼する方法**

- 良いリクエスト例と悪い例
- テーブル作成、カラム追加、RLS変更のテンプレート
- 避けるべきリクエストパターン
- 変更前後の確認事項
- チェックリスト

**このガイドに従うことで、安全で効率的なデータベース変更が可能になります**

### `/docs/DATABASE_CHANGE_QUICK_REFERENCE.md` ⚡ クイックリファレンス
**すぐに使えるリクエストテンプレート集**

- テーブル作成
- カラム追加・変更・削除
- RLS/インデックス/外部キー
- デモデータ更新
- よく使うSQLスニペット

**コピー&ペーストで即座にリクエストできます**

### `/docs/UI_STYLE_GUIDE.md`
UIデザインのガイドライン

### `/docs/DARK_MODE_STATUS.md`
ダークモードの実装状況

---

## 🗄️ アーカイブ（参考用）

以下のドキュメントは過去の記録として保存されていますが、現在のルールとしては無効です。

### `/docs/DEMO_DATA_POLICY.md`
→ `/docs/DATABASE_RULES.md` に統合済み

### `/docs/SECURITY_CRITICAL_FINDINGS.md`
→ 過去のセキュリティ問題の記録

---

## ❌ 削除されたドキュメント

以下のドキュメントは矛盾する情報を含んでいたため削除されました：

- `DATABASE_INITIALIZATION_STRATEGY.md`
- `DATABASE_STATUS.md`
- `MIGRATION_AUDIT_REPORT.md`
- `DATABASE_VERIFICATION_REPORT.md`
- `MIGRATION_ANALYSIS.md`
- `DATABASE_CLEANUP_SUMMARY.md`

**削除理由**: これらが複数のAIセッションで混乱を引き起こし、デモデータをマイグレーションに含めてしまう原因となっていました。

---

**最終更新**: 2025-11-25
