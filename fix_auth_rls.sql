-- ============================================================================
-- Auth Schema RLS Fix
-- ============================================================================
--
-- 目的: auth schemaのRow Level Security (RLS)を無効化してログイン機能を復旧
--
-- 問題:
--   auth.users および関連テーブルでRLSが有効になっているが、ポリシーが
--   存在しないため、すべての認証クエリが失敗している。
--
-- 解決方法:
--   auth schemaのすべてのテーブルでRLSを無効化する。
--   これはauth schemaの正常な状態である。
--
-- セキュリティへの影響:
--   なし - auth schemaはSupabaseが内部的に管理しており、
--   APIレベルで保護されている。RLSは不要。
--
-- 実行方法:
--   1. Supabase Dashboard (https://app.supabase.com) にアクセス
--   2. プロジェクトを選択: eltljgtymayhilowlyml
--   3. SQL Editor を開く
--   4. このファイルの内容をコピー＆ペースト
--   5. 実行
--
-- 確認方法:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'auth'
--   ORDER BY tablename;
--
--   すべてのテーブルで rowsecurity = false であることを確認
--
-- ============================================================================

-- Critical auth tables
ALTER TABLE IF EXISTS auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.identities DISABLE ROW LEVEL SECURITY;

-- MFA (Multi-Factor Authentication) tables
ALTER TABLE IF EXISTS auth.mfa_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.mfa_amr_claims DISABLE ROW LEVEL SECURITY;

-- OAuth and SSO tables
ALTER TABLE IF EXISTS auth.oauth_authorizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.oauth_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.oauth_consents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.sso_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.sso_domains DISABLE ROW LEVEL SECURITY;

-- SAML tables
ALTER TABLE IF EXISTS auth.saml_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.saml_relay_states DISABLE ROW LEVEL SECURITY;

-- Other auth tables
ALTER TABLE IF EXISTS auth.flow_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth.schema_migrations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 確認クエリ（実行後にこれを実行して確認）
-- ============================================================================
--
-- SELECT
--   tablename,
--   CASE
--     WHEN rowsecurity = false THEN '✅ 正常'
--     WHEN rowsecurity = true THEN '⚠️  要修正'
--     ELSE '不明'
--   END as status
-- FROM pg_tables
-- WHERE schemaname = 'auth'
-- ORDER BY tablename;
--
-- ============================================================================
