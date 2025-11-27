#!/usr/bin/env python3
"""
Backup script using direct SQL queries via MCP tool simulation
"""
import json
import os
from datetime import datetime
from pathlib import Path

# This script will output SQL queries that you can run via MCP tool
# Then save the results manually

tables = [
    'user_settings',
    'account_summary',
    'ai_coaching_jobs',
    'daily_notes',
    'ai_proposals',
    'account_transactions',
    'import_history',
    'trade_notes'
]

# For trades table, we'll need to split it
print("=" * 60)
print("BACKUP INSTRUCTIONS")
print("=" * 60)
print("\nRun these SQL queries via MCP tool and save results:\n")

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = f"backups/{timestamp}"

print(f"1. Create backup directory: mkdir -p {backup_dir}\n")

for table in tables:
    print(f"2. Query: SELECT * FROM {table};")
    print(f"   Save to: {backup_dir}/{table}.json\n")

# For trades, we need pagination
print("3. For trades table (large), use pagination:")
print("   SELECT * FROM trades ORDER BY id LIMIT 100 OFFSET 0;")
print("   SELECT * FROM trades ORDER BY id LIMIT 100 OFFSET 100;")
print("   ...continue until all records are fetched\n")

print(f"\nBackup location: {backup_dir}/")
