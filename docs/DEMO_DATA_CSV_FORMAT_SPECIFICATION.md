# デモデータCSVフォーマット仕様書

## 概要

このドキュメントでは、デモデータとして使用するCSVファイルのフォーマット仕様を定義します。
この仕様に従ってCSVファイルを作成すれば、システムに直接統合できます。

---

## 1. 取引データ（Trades）

### ファイル名
- `A.csv`, `B.csv`, `C.csv` など
- 配置場所: `/public/demo/`

### CSVフォーマット

**ヘッダー行（1行目）**:
```csv
Ticket,Item,Type,Size,Open Time,Open Price,Close Time,Close Price,S/L,T/P,Commission,Swap,Profit,Comment
```

**データ行の例**:
```csv
500000001,EURUSD,buy,0.1,2024.11.01 09:30:00,1.08500,2024.11.01 15:45:00,1.08650,1.08300,1.08800,-7,0,1450,順張りエントリー成功
500000002,USDJPY,sell,0.2,2024.11.01 13:20:00,149.850,2024.11.01 17:30:00,149.650,-7,0,2800,レンジ上限からの戻り
```

### カラム定義

| カラム名 | データ型 | 必須 | 説明 | 例 |
|---------|---------|------|------|-----|
| Ticket | text | ✅ | 取引番号（一意） | 500000001 |
| Item | text | ✅ | 通貨ペア | EURUSD, USDJPY, GBPJPY |
| Type | text | ✅ | 取引種別 | buy, sell, balance, deposit |
| Size | numeric | ✅ | ロットサイズ | 0.1, 0.5, 1.0 |
| Open Time | timestamp | ✅ | エントリー時刻 | 2024.11.01 09:30:00 |
| Open Price | numeric | ✅ | エントリー価格 | 1.08500 |
| Close Time | timestamp | ✅ | 決済時刻 | 2024.11.01 15:45:00 |
| Close Price | numeric | ✅ | 決済価格 | 1.08650 |
| S/L | numeric | ⚪ | ストップロス | 1.08300 (0 or 0.0 で未設定) |
| T/P | numeric | ⚪ | テイクプロフィット | 1.08800 (0 or 0.0 で未設定) |
| Commission | numeric | ✅ | 手数料（円） | -7 |
| Swap | numeric | ✅ | スワップ（円） | 0, -150, 200 |
| Profit | numeric | ✅ | 損益（円） | 1450, -2300 |
| Comment | text | ⚪ | コメント | 順張りエントリー成功 |

### 注意事項

1. **Ticket番号**: 同じCSVファイル内で一意である必要があります
2. **Type**: `balance`と`deposit`は入金・残高調整用の特殊な取引タイプです
3. **日時フォーマット**: `YYYY.MM.DD HH:MM:SS` 形式を使用
4. **数値**: 小数点は `.` を使用（カンマ区切りは不可）
5. **文字エンコーディング**: UTF-8

---

## 2. 取引ノート（Trade Notes）

### ファイル名
- `A_trade_notes.csv`, `B_trade_notes.csv`, `C_trade_notes.csv` など
- 配置場所: `/public/demo/`

### CSVフォーマット

**ヘッダー行**:
```csv
ticket,entry_emotion,entry_basis,tech_set,market_set,fund_set,fund_note,exit_triggers,exit_emotion,note_right,note_wrong,note_next,note_free,tags,ai_advice
```

**データ行の例**:
```csv
500000001,冷静,["トレンド継続","サポート反発"],["MA交差","RSI30以下"],["上昇トレンド","ボラティリティ高"],["雇用統計良好"],雇用統計後の上昇継続を狙った,["利益目標達成"],満足,ルール通りのエントリーができた,もう少し早くエントリーできた,次回も同じセットアップを狙う,初動を逃さないよう監視を強化,["順張り","デイトレード"],トレンドフォローの好例です
500000002,やや焦り,["レンジ上限"],["ボリンジャー上限タッチ"],["レンジ相場"],[],,["損切り"],反省,レンジ環境を正しく認識できた,ロットが大きすぎた,次回はロットを0.1に抑える,感情的にならないよう注意,["逆張り","スキャルピング"],ロット管理に注意
```

### カラム定義

| カラム名 | データ型 | 必須 | 説明 | 例 |
|---------|---------|------|------|-----|
| ticket | text | ✅ | 取引番号（Trades CSVと対応） | 500000001 |
| entry_emotion | text | ⚪ | エントリー時の感情 | 冷静, 焦り, 自信あり |
| entry_basis | JSON array | ⚪ | エントリー根拠（配列） | ["トレンド継続","サポート反発"] |
| tech_set | JSON array | ⚪ | テクニカル条件（配列） | ["MA交差","RSI30以下"] |
| market_set | JSON array | ⚪ | マーケット環境（配列） | ["上昇トレンド","ボラティリティ高"] |
| fund_set | JSON array | ⚪ | ファンダメンタルズ（配列） | ["雇用統計良好"] |
| fund_note | text | ⚪ | ファンダメンタルズメモ | 雇用統計後の上昇継続を狙った |
| exit_triggers | JSON array | ⚪ | 決済のきっかけ（配列） | ["利益目標達成","損切り"] |
| exit_emotion | text | ⚪ | 決済時の感情 | 満足, 後悔, 焦り |
| note_right | text | ⚪ | うまくいった点 | ルール通りのエントリーができた |
| note_wrong | text | ⚪ | 改善点 | もう少し早くエントリーできた |
| note_next | text | ⚪ | 次回の約束 | 次回も同じセットアップを狙う |
| note_free | text | ⚪ | 自由メモ | 初動を逃さないよう監視を強化 |
| tags | JSON array | ⚪ | タグ（配列） | ["順張り","デイトレード"] |
| ai_advice | text | ⚪ | AIアドバイス | トレンドフォローの好例です |

### JSON配列の書き方

```csv
["要素1","要素2","要素3"]
```

- ダブルクォートで囲む
- 要素はカンマで区切る
- 空の配列: `[]`
- CSV内でダブルクォートをエスケープする場合は `""` を使用

### 注意事項

1. **ticket**: Trades CSVの`Ticket`カラムと完全一致する必要があります
2. **すべてのカラムは省略可能**: 空の場合は空文字列 `""` を設定
3. **JSON配列**: 正しいJSON形式で記述（不正な形式はエラーになります）
4. **改行**: CSVフィールド内の改行は `\n` でエスケープ

---

## 3. 日次ノート（Daily Notes）

### ファイル名
- `A_daily_notes.csv`, `B_daily_notes.csv`, `C_daily_notes.csv` など
- 配置場所: `/public/demo/`

### CSVフォーマット

**ヘッダー行**:
```csv
date_key,title,good,improve,next_promise,free
```

**データ行の例**:
```csv
2024-11-01,堅実なトレード,ルール遵守ができた。損切りも迷わず実行,エントリーが少し遅れた,明日はもっと早く動く,今日の相場は上昇トレンドが明確だった
2024-11-02,反省の多い日,ロット管理は良好,感情的になって無駄なトレードをした,冷静さを保つ。トレード前に深呼吸,レンジ相場でのトレードは慎重に
```

### カラム定義

| カラム名 | データ型 | 必須 | 説明 | 例 |
|---------|---------|------|------|-----|
| date_key | text | ✅ | 日付キー（YYYY-MM-DD） | 2024-11-01 |
| title | text | ⚪ | タイトル | 堅実なトレード |
| good | text | ⚪ | うまくいった点 | ルール遵守ができた |
| improve | text | ⚪ | 改善点 | エントリーが少し遅れた |
| next_promise | text | ⚪ | 次回の約束 | 明日はもっと早く動く |
| free | text | ⚪ | 自由メモ | 今日の相場は上昇トレンドが明確 |

### 注意事項

1. **date_key**: `YYYY-MM-DD` 形式で統一
2. **date_keyの範囲**: Trades CSVに含まれる取引日付と対応させる
3. **取引がない日**: 日記のみ作成することも可能
4. **改行**: フィールド内の改行は `\n` でエスケープ、またはダブルクォートで囲む

---

## 4. 自由メモ（Free Memos）

### ファイル名
- `A_free_memos.csv`, `B_free_memos.csv`, `C_free_memos.csv` など
- 配置場所: `/public/demo/`

### CSVフォーマット

**ヘッダー行**:
```csv
id,title,content,date_key,tags
```

**データ行の例**:
```csv
memo-001,重要な気づき,トレンドフォローが自分に合っている。逆張りは避けるべき,2024-11-01,["戦略","気づき"]
memo-002,リスク管理メモ,1日の最大損失は資金の2%まで。これを厳守する,2024-11-02,["リスク管理","ルール"]
```

### カラム定義

| カラム名 | データ型 | 必須 | 説明 | 例 |
|---------|---------|------|------|-----|
| id | text | ✅ | メモID（一意） | memo-001, memo-002 |
| title | text | ✅ | タイトル | 重要な気づき |
| content | text | ⚪ | メモ内容 | トレンドフォローが自分に合っている |
| date_key | text | ✅ | 作成日（YYYY-MM-DD） | 2024-11-01 |
| tags | JSON array | ⚪ | タグ（配列） | ["戦略","気づき"] |

### 注意事項

1. **id**: CSVファイル内で一意である必要があります（`memo-001`, `memo-002`など）
2. **content**: 長文可能（ダブルクォートで囲む）
3. **tags**: JSON配列形式で記述

---

## 5. ノート間リンク（Note Links）

### ファイル名
- `A_note_links.csv`, `B_note_links.csv`, `C_note_links.csv` など
- 配置場所: `/public/demo/`

### CSVフォーマット

**ヘッダー行**:
```csv
source_type,source_id,target_type,target_id
```

**データ行の例**:
```csv
trade,500000001,daily,2024-11-01
trade,500000002,daily,2024-11-01
daily,2024-11-01,free,memo-001
free,memo-002,trade,500000003
```

### カラム定義

| カラム名 | データ型 | 必須 | 説明 | 値の種類 |
|---------|---------|------|------|---------|
| source_type | text | ✅ | リンク元タイプ | `trade`, `daily`, `free` |
| source_id | text | ✅ | リンク元ID | ticket番号, date_key, メモID |
| target_type | text | ✅ | リンク先タイプ | `trade`, `daily`, `free` |
| target_id | text | ✅ | リンク先ID | ticket番号, date_key, メモID |

### リンクの例

- 取引 → 日次ノート: `trade,500000001,daily,2024-11-01`
- 日次ノート → 自由メモ: `daily,2024-11-01,free,memo-001`
- 取引 → 取引: `trade,500000001,trade,500000002`（関連する取引同士をリンク）

### 注意事項

1. **type**: `trade`, `daily`, `free` のいずれか
2. **ID**: 対応するCSVファイルに存在するIDを指定
3. **双方向リンク**: 必要に応じて両方向のリンクを作成

---

## 6. データの整合性チェックリスト

CSVファイルを作成したら、以下をチェックしてください:

### ✅ 基本チェック
- [ ] すべてのファイルがUTF-8エンコーディング
- [ ] ヘッダー行が正しい順序・スペルで記述されている
- [ ] カラム数が全行で一致している
- [ ] 必須カラムに空白がない

### ✅ データの整合性
- [ ] Trades CSVの`Ticket`が一意
- [ ] Trade Notes CSVの`ticket`がTrades CSVに存在
- [ ] Daily Notes CSVの`date_key`が`YYYY-MM-DD`形式
- [ ] Free Memos CSVの`id`が一意
- [ ] Note Links CSVの`source_id`と`target_id`が対応するCSVに存在

### ✅ JSON形式
- [ ] JSON配列が正しい形式（`["要素1","要素2"]`）
- [ ] 空の配列は`[]`と記述
- [ ] ダブルクォートのエスケープが正しい

### ✅ 日付・数値
- [ ] 日時が`YYYY.MM.DD HH:MM:SS`形式（Trades CSV）
- [ ] 日付が`YYYY-MM-DD`形式（Daily Notes, Free Memos）
- [ ] 数値に不正な文字が含まれていない

---

## 7. サンプルデータセット

### 最小構成の例

**A.csv** (最低限の取引データ):
```csv
Ticket,Item,Type,Size,Open Time,Open Price,Close Time,Close Price,S/L,T/P,Commission,Swap,Profit,Comment
500000001,EURUSD,buy,0.1,2024.11.01 09:30:00,1.08500,2024.11.01 15:45:00,1.08650,0,0,-7,0,1450,
500000002,USDJPY,sell,0.2,2024.11.01 13:20:00,149.850,2024.11.01 17:30:00,149.650,0,0,-7,0,2800,
```

**A_trade_notes.csv** (取引1件のみにノート):
```csv
ticket,entry_emotion,entry_basis,tech_set,market_set,fund_set,fund_note,exit_triggers,exit_emotion,note_right,note_wrong,note_next,note_free,tags,ai_advice
500000001,冷静,["トレンド継続"],["MA交差"],[],[],,"["利益目標達成"]",満足,ルール通り,なし,継続,良いトレード,["順張り"],好例
```

**A_daily_notes.csv** (1日分のノート):
```csv
date_key,title,good,improve,next_promise,free
2024-11-01,良い日,ルール遵守,特になし,継続,上昇トレンド
```

---

## 8. AI生成用プロンプト

他のAIにデモデータを生成してもらう場合、以下のプロンプトを使用してください:

```
# デモトレードデータ生成依頼

以下の仕様に従って、FXトレード日記用のデモデータセットを生成してください。

## 生成するファイル
1. A.csv（取引データ: 100-200件）
2. A_trade_notes.csv（取引ノート: 30-50件程度）
3. A_daily_notes.csv（日次ノート: 取引がある日付分）
4. A_free_memos.csv（自由メモ: 5-10件）
5. A_note_links.csv（ノート間リンク: 10-20件）

## データの要件
- 期間: 2024年11月1日〜2024年11月30日（1ヶ月分）
- トレードスタイル: デイトレード/スイングトレード混合
- 通貨ペア: EURUSD, USDJPY, GBPJPY, AUDUSD, USDCADなど主要5-7ペア
- 勝率: 55-65%程度
- 損益: プラス収支（月間+10万円〜+30万円程度）
- 取引頻度: 平日1日あたり2-5件

## リアリティの追求
- 損切りも含めた現実的なトレード
- 連勝・連敗の波がある
- ロット管理（0.1〜0.5ロット）
- 感情の起伏（冷静、焦り、後悔など）
- 改善点や反省点を含む
- エントリー根拠が具体的（テクニカル・ファンダメンタルズ）

## フォーマット仕様
（上記のCSVフォーマット仕様をすべて含める）

このプロンプトと合わせて、上記のCSVフォーマット仕様書全体を渡してください。
```

---

## まとめ

### ファイル一覧
```
/public/demo/
├── A.csv                   # 取引データ（必須）
├── A_trade_notes.csv       # 取引ノート（オプション）
├── A_daily_notes.csv       # 日次ノート（オプション）
├── A_free_memos.csv        # 自由メモ（オプション）
├── A_note_links.csv        # ノート間リンク（オプション）
├── B.csv                   # データセットB（オプション）
└── ...
```

### 統合手順
1. CSVファイルを仕様に従って作成
2. `/public/demo/`フォルダに配置
3. システムが自動的に読み込み・表示

### サポート
- 質問や不明点があれば、このドキュメントを参照してください
- CSV生成後、整合性チェックリストで検証してください
