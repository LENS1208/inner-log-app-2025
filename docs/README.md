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
