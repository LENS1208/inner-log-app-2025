-- =====================================================
-- FIX AUTH SCHEMA RLS - EXECUTE THIS IN SUPABASE DASHBOARD
-- =====================================================
--
-- Problem: All auth.* tables have RLS enabled with 0 policies
-- Result: All login attempts fail with "Database error querying schema"
--
-- Solution: Disable RLS on auth schema (this is the correct config)
--
-- WHERE TO RUN THIS:
-- 1. Open: https://app.supabase.com/project/eltljgtymayhilowlyml
-- 2. Click "SQL Editor" in left menu
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- =====================================================

ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.flow_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_relay_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.schema_migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.instances DISABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;

-- Expected result: All tables should show rls_enabled = false
