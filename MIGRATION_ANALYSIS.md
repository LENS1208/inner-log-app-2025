# Migration Files Analysis

## Current State
- Total migrations: 69 files
- Many duplicates, test user manipulations, and temporary fixes
- Database is functional but migration history is cluttered

## Core Schema Migrations (KEEP)
1. `20251028013408_create_trading_journal_tables.sql` - Initial tables
2. `20251028063214_add_free_memos_and_links.sql` - Add memo/link fields
3. `20251104012638_add_dataset_column_to_trades.sql` - Dataset support
4. `20251105134008_create_user_settings_table.sql` - User settings
5. `20251105223300_add_settings_page_columns.sql` - Extended settings
6. `20251106021717_add_user_id_and_secure_rls_policies.sql` - RLS policies
7. `20251106102729_create_account_transactions_table.sql` - Transactions table
8. `20251111064202_create_ai_proposals_table.sql` - AI proposals
9. `20251111065954_add_parent_id_to_ai_proposals.sql` - Proposal threading
10. `20251111114430_add_auto_create_user_settings_trigger.sql` - Auto-create settings
11. `20251111114452_add_data_integrity_constraints.sql` - Data integrity
12. `20251112005541_add_user_rating_to_ai_proposals.sql` - User ratings
13. `20251112010038_update_user_rating_to_decimal.sql` - Rating precision
14. `20251112021301_normalize_item_to_uppercase.sql` - Item normalization
15. `20251116065904_create_coaching_jobs_table.sql` - Coaching jobs
16. `20251116121329_add_coach_avatar_preset_to_user_settings.sql` - Avatar presets
17. `20251116123113_create_import_history_table.sql` - Import tracking
18. `20251116130000_recalculate_pips_for_all_instruments.sql` - Pips calculation fix

## Temporary/Test Migrations (CAN REMOVE)
- Multiple test user creation/deletion files (20251105224350, 20251105224642, etc.)
- Password reset attempts (20251117022234, 20251117030943, 20251117033034, etc.)
- Duplicate schema files (20251111104715, 20251111104720, 20251111104724)
- Demo data population files (可keep for reference)
- Multiple pip recalculation attempts (20251111012140, 20251111012810)
- Multiple unique constraint fixes (20251111030305, 20251111030328, etc.)
- Email confirmation changes (20251117071120, 20251117071631, 20251117141626)

## Recommendation
Create ONE consolidated migration with:
1. Complete schema from scratch
2. All necessary RLS policies
3. All triggers and functions
4. Proper indexes and constraints

This will replace all 69 files with 1 clean migration.
