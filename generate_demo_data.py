#!/usr/bin/env python3
"""
デモトレードデータ生成スクリプト
リアルな収益曲線を持つ3つのデータセットを生成
"""

import random
import csv
from datetime import datetime, timedelta

# 通貨ペア
PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURJPY', 'GBPJPY']

def generate_dataset_a(num_trades=500):
    """
    データセットA: 波のある負けトレーダー
    勝率44%, 総損失-7万円程度
    大きなドローダウンを含むリアルな収益曲線
    上昇→大幅下落→回復→再下落のパターン
    """
    trades = []
    cumulative_profit = 0

    # 今日の日付から逆算して開始日を設定（約3年前から今日まで）
    today = datetime.now()
    base_date = today - timedelta(days=1095)

    # フェーズごとの設定
    # フェーズ1: 上昇期（0-30%） 15万円まで
    # フェーズ2: 下落期（30-45%） 6万円まで
    # フェーズ3: 回復期（45-70%） 13万円まで
    # フェーズ4: 大幅下落期（70-100%） -7万円まで

    for i in range(num_trades):
        ticket = 101000000 + i
        pair = random.choice(PAIRS)
        side = random.choice(['buy', 'sell'])
        size = random.choice([0.30, 0.50, 1.00, 2.00])

        # 開始時間
        open_time = base_date + timedelta(days=random.randint(0, 1095), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        # 終了時間（30分〜5時間後）
        close_time = open_time + timedelta(minutes=random.randint(30, 300))

        progress_ratio = i / num_trades

        # フェーズ判定
        if progress_ratio < 0.30:  # フェーズ1: 上昇
            target = 150000
            current_target = target * (progress_ratio / 0.30)
            bias = current_target - cumulative_profit
            win_rate = 0.58
        elif progress_ratio < 0.45:  # フェーズ2: 下落
            phase_progress = (progress_ratio - 0.30) / 0.15
            target = 150000 - (90000 * phase_progress)  # 15万→6万
            bias = target - cumulative_profit
            win_rate = 0.30
        elif progress_ratio < 0.70:  # フェーズ3: 回復
            phase_progress = (progress_ratio - 0.45) / 0.25
            target = 60000 + (70000 * phase_progress)  # 6万→13万
            bias = target - cumulative_profit
            win_rate = 0.52
        else:  # フェーズ4: 大幅下落
            phase_progress = (progress_ratio - 0.70) / 0.30
            target = 130000 - (200000 * phase_progress)  # 13万→-7万
            bias = target - cumulative_profit
            win_rate = 0.4985

        is_win = random.random() < win_rate

        if is_win:
            # 勝ち: 基準額 + バイアス影響
            base_profit = random.uniform(1500, 8000)
            # 上昇フェーズでは大きな勝ちが出やすい
            if progress_ratio < 0.25 or (0.40 < progress_ratio < 0.65):
                if random.random() < 0.15:
                    base_profit *= random.uniform(1.5, 2.0)
            # バイアス調整を穏やかに
            bias_factor = max(0.7, min(1.3, 1 + bias / 150000))
            profit = int(base_profit * bias_factor)
        else:
            # 負け
            base_loss = random.uniform(1800, 9000)
            # 下落フェーズでは大きな負けが出やすい
            if progress_ratio > 0.25:
                if random.random() < 0.18:
                    base_loss *= random.uniform(1.5, 2.0)
            # バイアス調整を穏やかに
            bias_factor = max(0.7, min(1.3, 1 + abs(bias) / 100000))
            profit = -int(base_loss * bias_factor)

        cumulative_profit += profit

        # 価格データ
        if 'JPY' in pair:
            open_price = random.uniform(100, 160)
            pips = (profit / (size * 100)) / 10
        else:
            open_price = random.uniform(0.95, 1.50)
            pips = profit / (size * 10000)

        close_price = open_price + (pips / 10000 if 'JPY' not in pair else pips / 100)
        if side == 'sell':
            close_price = open_price - (pips / 10000 if 'JPY' not in pair else pips / 100)

        # SL/TP
        sl = open_price - (0.003 if side == 'buy' else -0.003)
        tp = open_price + (0.004 if side == 'buy' else -0.004)

        # 手数料とスワップ
        commission = -12.0 if random.random() < 0.3 else 0.0
        swap = round(random.uniform(-10, 10), 1)

        trades.append({
            'Ticket': ticket,
            'Item': pair,
            'Type': side,
            'Size': size,
            'Open Time': open_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Open Price': round(open_price, 3 if 'JPY' in pair else 5),
            'Close Time': close_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Close Price': round(close_price, 3 if 'JPY' in pair else 5),
            'S/L': round(sl, 3 if 'JPY' in pair else 5),
            'T/P': round(tp, 3 if 'JPY' in pair else 5),
            'Commission': commission,
            'Swap': swap,
            'Profit': float(profit),
            'Comment': ''
        })

    return trades


def generate_dataset_b(num_trades=380):
    """
    データセットB: 激しい波のある優秀トレーダー
    勝率59%, 総利益420万円程度
    大きな調整局面を含むダイナミックな成長曲線
    初期急上昇→大幅調整→激しい上昇→深い調整→最終爆上げ
    """
    trades = []
    cumulative_profit = 0
    consecutive_wins = 0

    # 今日の日付から逆算して開始日を設定（約3年前から今日まで）
    today = datetime.now()
    base_date = today - timedelta(days=1095)

    # フェーズごとの設定（より激しい変動）
    # フェーズ1: 初期急上昇（0-25%） 200万円まで
    # フェーズ2: 大幅調整（25-40%） 30万円まで
    # フェーズ3: 激しい上昇（40-60%） 350万円まで
    # フェーズ4: 深い調整（60-75%） 180万円まで
    # フェーズ5: 最終爆上げ（75-100%） 420万円まで

    for i in range(num_trades):
        ticket = 101000000 + i
        pair = random.choice(PAIRS)
        side = random.choice(['buy', 'sell'])
        size = random.choice([0.30, 0.50, 1.00, 2.00])

        open_time = base_date + timedelta(days=random.randint(0, 1095), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        close_time = open_time + timedelta(minutes=random.randint(30, 300))

        progress_ratio = i / num_trades

        # フェーズ判定
        if progress_ratio < 0.25:  # フェーズ1: 初期急上昇
            target = 2000000
            current_target = target * (progress_ratio / 0.25)
            bias = current_target - cumulative_profit
            win_rate = 0.72
        elif progress_ratio < 0.40:  # フェーズ2: 大幅調整
            phase_progress = (progress_ratio - 0.25) / 0.15
            target = 2000000 - (1700000 * phase_progress)  # 200万→30万
            bias = target - cumulative_profit
            win_rate = 0.28
        elif progress_ratio < 0.60:  # フェーズ3: 激しい上昇
            phase_progress = (progress_ratio - 0.40) / 0.20
            target = 300000 + (3200000 * phase_progress)  # 30万→350万
            bias = target - cumulative_profit
            win_rate = 0.75
        elif progress_ratio < 0.75:  # フェーズ4: 深い調整
            phase_progress = (progress_ratio - 0.60) / 0.15
            target = 3500000 - (1700000 * phase_progress)  # 350万→180万
            bias = target - cumulative_profit
            win_rate = 0.32
        else:  # フェーズ5: 最終爆上げ
            phase_progress = (progress_ratio - 0.75) / 0.25
            target = 1800000 + (2400000 * phase_progress)  # 180万→420万
            bias = target - cumulative_profit
            win_rate = 0.78

        is_win = random.random() < win_rate

        if is_win:
            consecutive_wins += 1
            # 勝ち
            base_profit = random.uniform(20000, 60000)
            # 連勝ボーナス
            if consecutive_wins >= 3:
                base_profit *= (1 + consecutive_wins * 0.12)
            # 上昇フェーズでは突発的な大勝
            if progress_ratio < 0.25 or (0.40 < progress_ratio < 0.60) or progress_ratio > 0.75:
                if random.random() < 0.22:
                    base_profit *= random.uniform(2.2, 3.5)
            # バイアス調整を穏やかに
            bias_factor = max(0.4, min(1.8, 1 + bias / 3500000))
            profit = int(base_profit * bias_factor)
        else:
            consecutive_wins = 0
            # 負け（損切りが効いている）
            base_loss = random.uniform(12000, 35000)
            # 調整フェーズでは突発的な大損失
            if (0.25 < progress_ratio < 0.40) or (0.60 < progress_ratio < 0.75):
                if random.random() < 0.28:
                    base_loss *= random.uniform(2.0, 3.8)
            # バイアス調整を穏やかに
            bias_factor = max(0.4, min(1.8, 1 + abs(bias) / 2500000))
            profit = -int(base_loss * bias_factor)

        cumulative_profit += profit

        # 価格データ
        if 'JPY' in pair:
            open_price = random.uniform(100, 160)
            pips = (profit / (size * 100)) / 10
        else:
            open_price = random.uniform(0.95, 1.50)
            pips = profit / (size * 10000)

        close_price = open_price + (pips / 10000 if 'JPY' not in pair else pips / 100)
        if side == 'sell':
            close_price = open_price - (pips / 10000 if 'JPY' not in pair else pips / 100)

        sl = open_price - (0.003 if side == 'buy' else -0.003)
        tp = open_price + (0.006 if side == 'buy' else -0.006)

        commission = -12.0 if random.random() < 0.3 else 0.0
        swap = round(random.uniform(-10, 10), 1)

        trades.append({
            'Ticket': ticket,
            'Item': pair,
            'Type': side,
            'Size': size,
            'Open Time': open_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Open Price': round(open_price, 3 if 'JPY' in pair else 5),
            'Close Time': close_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Close Price': round(close_price, 3 if 'JPY' in pair else 5),
            'S/L': round(sl, 3 if 'JPY' in pair else 5),
            'T/P': round(tp, 3 if 'JPY' in pair else 5),
            'Commission': commission,
            'Swap': swap,
            'Profit': float(profit),
            'Comment': ''
        })

    return trades


def generate_dataset_c(num_trades=620):
    """
    データセットC: ジェットコースター型の波乱トレーダー
    勝率48%, 総利益32.5万円程度
    極めて激しい上下変動を経て最終的に利益
    急上昇→壊滅的暴落→奇跡の大反発→再度の大暴落→底打ち→最終回復
    """
    trades = []
    cumulative_profit = 0
    consecutive_losses = 0

    # 今日の日付から逆算して開始日を設定（約3年前から今日まで）
    today = datetime.now()
    base_date = today - timedelta(days=1095)

    # フェーズごとの設定（激しい変動、最終的に利益）
    # フェーズ1: 急上昇（0-15%） 80万円まで
    # フェーズ2: 壊滅的暴落（15-32%） -150万円まで
    # フェーズ3: 奇跡の大反発（32-48%） 100万円まで
    # フェーズ4: 再度の大暴落（48-68%） -120万円まで
    # フェーズ5: 底打ち（68-82%） -80万円まで
    # フェーズ6: 最終回復（82-100%） 32.5万円まで

    for i in range(num_trades):
        ticket = 101000000 + i
        pair = random.choice(PAIRS)
        side = random.choice(['buy', 'sell'])
        # 損失が大きくなると取引サイズを増やす傾向（リベンジトレード）
        if consecutive_losses >= 3:
            size = random.choice([1.00, 2.00, 2.00, 2.00])
        else:
            size = random.choice([0.30, 0.50, 1.00, 2.00])

        open_time = base_date + timedelta(days=random.randint(0, 1095), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        close_time = open_time + timedelta(minutes=random.randint(30, 300))

        progress_ratio = i / num_trades

        # フェーズ判定
        if progress_ratio < 0.15:  # フェーズ1: 急上昇
            target = 800000
            current_target = target * (progress_ratio / 0.15)
            bias = current_target - cumulative_profit
            win_rate = 0.68
        elif progress_ratio < 0.32:  # フェーズ2: 壊滅的暴落
            phase_progress = (progress_ratio - 0.15) / 0.17
            target = 800000 - (2300000 * phase_progress)  # 80万→-150万
            bias = target - cumulative_profit
            win_rate = 0.22
        elif progress_ratio < 0.48:  # フェーズ3: 奇跡の大反発
            phase_progress = (progress_ratio - 0.32) / 0.16
            target = -1500000 + (2500000 * phase_progress)  # -150万→100万
            bias = target - cumulative_profit
            win_rate = 0.75
        elif progress_ratio < 0.68:  # フェーズ4: 再度の大暴落
            phase_progress = (progress_ratio - 0.48) / 0.20
            target = 1000000 - (2200000 * phase_progress)  # 100万→-120万
            bias = target - cumulative_profit
            win_rate = 0.25
        elif progress_ratio < 0.82:  # フェーズ5: 底打ち
            phase_progress = (progress_ratio - 0.68) / 0.14
            target = -1200000 + (400000 * phase_progress)  # -120万→-80万
            bias = target - cumulative_profit
            win_rate = 0.42
        else:  # フェーズ6: 最終回復
            phase_progress = (progress_ratio - 0.82) / 0.18
            target = -800000 + (1125000 * phase_progress)  # -80万→32.5万
            bias = target - cumulative_profit
            win_rate = 0.80

        is_win = random.random() < win_rate

        if is_win:
            consecutive_losses = 0
            # 勝ち
            base_profit = random.uniform(8000, 22000)
            # 大反発フェーズでは突発的な大勝ち
            if (0.32 < progress_ratio < 0.48):
                if random.random() < 0.30:
                    base_profit *= random.uniform(2.2, 3.2)
            # 最終回復フェーズでも大勝ちが出やすい
            elif progress_ratio > 0.82:
                if random.random() < 0.35:
                    base_profit *= random.uniform(2.5, 3.5)
            # バイアス調整を強めに
            bias_factor = max(0.2, min(2.0, 1 + bias / 1650000))
            profit = int(base_profit * bias_factor)
        else:
            consecutive_losses += 1
            # 負け
            base_loss = random.uniform(7000, 19000)
            # 連敗時はさらに大きな損失（パニック的にロット増加）
            if consecutive_losses >= 3:
                base_loss *= (1 + consecutive_losses * 0.09)
            # 暴落フェーズでは破滅的な大損失
            if (0.15 < progress_ratio < 0.32) or (0.48 < progress_ratio < 0.68):
                if random.random() < 0.26:
                    base_loss *= random.uniform(1.8, 3.2)
            # バイアス調整を強めに
            bias_factor = max(0.3, min(1.8, 1 + abs(bias) / 1600000))
            profit = -int(base_loss * bias_factor)

        cumulative_profit += profit

        # 価格データ
        if 'JPY' in pair:
            open_price = random.uniform(100, 160)
            pips = (profit / (size * 100)) / 10
        else:
            open_price = random.uniform(0.95, 1.50)
            pips = profit / (size * 10000)

        close_price = open_price + (pips / 10000 if 'JPY' not in pair else pips / 100)
        if side == 'sell':
            close_price = open_price - (pips / 10000 if 'JPY' not in pair else pips / 100)

        sl = open_price - (0.005 if side == 'buy' else -0.005)
        tp = open_price + (0.003 if side == 'buy' else -0.003)

        commission = -12.0 if random.random() < 0.3 else 0.0
        swap = round(random.uniform(-10, 10), 1)

        trades.append({
            'Ticket': ticket,
            'Item': pair,
            'Type': side,
            'Size': size,
            'Open Time': open_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Open Price': round(open_price, 3 if 'JPY' in pair else 5),
            'Close Time': close_time.strftime('%Y.%m.%d %H:%M:%S'),
            'Close Price': round(close_price, 3 if 'JPY' in pair else 5),
            'S/L': round(sl, 3 if 'JPY' in pair else 5),
            'T/P': round(tp, 3 if 'JPY' in pair else 5),
            'Commission': commission,
            'Swap': swap,
            'Profit': float(profit),
            'Comment': ''
        })

    return trades


def write_csv(filename, trades):
    """CSVファイルに書き出し"""
    fieldnames = ['Ticket', 'Item', 'Type', 'Size', 'Open Time', 'Open Price',
                  'Close Time', 'Close Price', 'S/L', 'T/P', 'Commission',
                  'Swap', 'Profit', 'Comment']

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(trades)

    # 統計情報を表示
    total_profit = sum(t['Profit'] for t in trades)
    wins = sum(1 for t in trades if t['Profit'] > 0)
    losses = sum(1 for t in trades if t['Profit'] < 0)
    win_rate = wins / len(trades) * 100 if trades else 0

    print(f"\n{filename}:")
    print(f"  取引数: {len(trades)}")
    print(f"  勝ち: {wins}, 負け: {losses}")
    print(f"  勝率: {win_rate:.1f}%")
    print(f"  総損益: {total_profit:,.0f}円 ({total_profit/10000:.1f}万円)")


if __name__ == '__main__':
    print("デモデータ生成中...")

    # データセットA: 少し稼ぐトレーダー
    trades_a = generate_dataset_a(500)
    write_csv('public/demo/A.csv', trades_a)

    # データセットB: 成績優秀者
    trades_b = generate_dataset_b(380)
    write_csv('public/demo/B.csv', trades_b)

    # データセットC: 下手なトレーダー
    trades_c = generate_dataset_c(620)
    write_csv('public/demo/C.csv', trades_c)

    print("\n完了！")
