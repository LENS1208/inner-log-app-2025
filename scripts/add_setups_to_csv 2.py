#!/usr/bin/env python3
"""
デモCSVファイルにセットアップ情報を追加するスクリプト
"""
import csv
import sys
from pathlib import Path

def add_setups_to_csv(csv_path):
    """CSVファイルを読み込んでセットアップ情報を追加"""

    setups = ['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range', 'Scalp']

    # CSVファイルを読み込み
    rows = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for i, row in enumerate(reader):
            # 各行にセットアップを割り当て（6つを順番に繰り返し）
            setup = setups[i % 6]
            # commentフィールドが空の場合はセットアップを追加
            if not row['Comment'] or row['Comment'].strip() == '':
                row['Comment'] = setup
            rows.append(row)

    # CSVファイルを書き込み
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['Ticket', 'Item', 'Type', 'Size', 'Open Time', 'Open Price',
                     'Close Time', 'Close Price', 'S/L', 'T/P', 'Commission',
                     'Swap', 'Profit', 'Comment']
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ Updated {csv_path} with setup information ({len(rows)} trades)")

    # 統計を表示
    setup_counts = {}
    for row in rows:
        setup = row['Comment']
        setup_counts[setup] = setup_counts.get(setup, 0) + 1

    print("\nSetup distribution:")
    for setup, count in sorted(setup_counts.items()):
        print(f"  {setup}: {count}")

if __name__ == '__main__':
    # プロジェクトルートからの相対パス
    project_root = Path(__file__).parent.parent
    demo_dir = project_root / 'public' / 'demo'

    # A, B, Cの各ファイルを処理
    for dataset in ['A', 'B', 'C']:
        csv_path = demo_dir / f'{dataset}.csv'
        if csv_path.exists():
            print(f"\n{'='*60}")
            print(f"Processing dataset {dataset}...")
            print(f"{'='*60}")
            add_setups_to_csv(csv_path)
        else:
            print(f"⚠️  File not found: {csv_path}")

    print(f"\n{'='*60}")
    print("✨ All datasets updated successfully!")
    print(f"{'='*60}")
