#!/usr/bin/env python3
import os
import sys

# Read all generated SQL files and execute them via MCP
sql_files = [
    'insert_0_trades.sql',
    'insert_1_trades.sql',
    'insert_2_trades.sql',
    'insert_3_account_transactions.sql',
    'insert_4_account_transactions.sql',
    'insert_5_account_transactions.sql',
    'insert_6_account_summary.sql',
    'insert_7_account_summary.sql',
    'insert_8_account_summary.sql'
]

print("To apply the demo data, run these SQL files in order using the MCP Supabase tool:")
print()
for i, sql_file in enumerate(sql_files, 1):
    print(f"{i}. {sql_file}")
print()
print("Due to RLS policies, these must be executed using mcp__supabase__execute_sql")
