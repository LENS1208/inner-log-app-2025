-- =====================================================
-- 🔴 CRITICAL FIX - EXECUTE IN SUPABASE DASHBOARD NOW
-- =====================================================
--
-- PROBLEM: auth.users has RLS enabled with 0 policies
-- RESULT: All login attempts fail with "Database error querying schema"
--
-- 📍 WHERE TO RUN:
-- 1. Open: https://app.supabase.com/project/eltljgtymayhilowlyml
-- 2. Click "SQL Editor" in left sidebar
-- 3. Click "New query"
-- 4. Copy this ENTIRE file and paste
-- 5. Click "RUN" button (or press Cmd+Enter)
--
-- ⏱️ Takes: <1 second
-- ✅ Effect: Immediate - login will work instantly
-- =====================================================

-- Disable RLS on all auth schema tables
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

-- Verify the fix (should show all false)
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;
