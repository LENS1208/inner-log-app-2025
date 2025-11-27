# UIスタイルガイド

このドキュメントは、ダークモード対応のボタンと入力フォームの統一ルールを定義します。

## 基本原則

1. **ハードコードされた色を使用しない**
2. **すべてのカラー値はCSS変数を使用する**
3. **ライトモードとダークモードの両方で視認性を確保する**

---

## CSS変数リファレンス

### 入力フォーム用の変数

```css
/* ライトモード */
--input-bg: #ffffff              /* 背景色 */
--input-border: #e2e8f0          /* ボーダー色 */
--input-border-focus: #0084c7    /* フォーカス時のボーダー色 */
--input-text: #1a202c            /* テキスト色 */
--input-placeholder: #a0aec0     /* プレースホルダー色 */

/* ダークモード */
--input-bg: #1f2937              /* 背景色 */
--input-border: #374151          /* ボーダー色 */
--input-border-focus: #01a1ff    /* フォーカス時のボーダー色 */
--input-text: #e4e8f0            /* テキスト色 */
--input-placeholder: #6b7280     /* プレースホルダー色 */
```

### ボタン用の変数

```css
/* プライマリボタン（ライトモード） */
--button-primary-bg: #0084c7
--button-primary-hover: #006ba3
--button-primary-text: #ffffff

/* プライマリボタン（ダークモード） */
--button-primary-bg: #01a1ff
--button-primary-hover: #0284c7
--button-primary-text: #ffffff

/* セカンダリボタン（ライトモード） */
--button-secondary-bg: #ffffff
--button-secondary-hover: #f8fafc
--button-secondary-text: #1a202c
--button-secondary-border: #e2e8f0

/* セカンダリボタン（ダークモード） */
--button-secondary-bg: #1f2937
--button-secondary-hover: #374151
--button-secondary-text: #e4e8f0
--button-secondary-border: #374151

/* 無効化ボタン（ライトモード） */
--button-disabled-bg: #a0aec0
--button-disabled-text: #ffffff

/* 無効化ボタン（ダークモード） */
--button-disabled-bg: #4b5563
--button-disabled-text: #9ca3af
```

---

## 実装パターン

### 1. テキスト入力フィールド

```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="入力してください"
  style={{
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '2px solid var(--input-border)',
    borderRadius: 12,
    background: 'var(--input-bg)',
    color: 'var(--input-text)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = 'var(--input-border-focus)';
  }}
  onBlur={(e) => {
    e.target.style.borderColor = 'var(--input-border)';
  }}
/>
```

### 2. セレクトボックス

```tsx
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  style={{
    width: '100%',
    height: 40,
    padding: '0 12px',
    fontSize: 14,
    border: '1px solid var(--input-border)',
    borderRadius: 12,
    background: 'var(--input-bg)',
    color: 'var(--input-text)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }}
>
  <option value="">選択してください</option>
  <option value="option1">オプション1</option>
</select>
```

### 3. プライマリボタン

```tsx
<button
  onClick={handleClick}
  disabled={loading}
  style={{
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: loading ? 'var(--button-disabled-text)' : 'var(--button-primary-text)',
    background: loading ? 'var(--button-disabled-bg)' : 'var(--button-primary-bg)',
    border: 'none',
    borderRadius: 12,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease',
  }}
  onMouseEnter={(e) => {
    if (!loading) {
      e.currentTarget.style.background = 'var(--button-primary-hover)';
    }
  }}
  onMouseLeave={(e) => {
    if (!loading) {
      e.currentTarget.style.background = 'var(--button-primary-bg)';
    }
  }}
>
  {loading ? '処理中...' : '実行'}
</button>
```

### 4. セカンダリボタン

```tsx
<button
  onClick={handleClick}
  style={{
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--button-secondary-text)',
    background: 'var(--button-secondary-bg)',
    border: '2px solid var(--button-secondary-border)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--button-secondary-hover)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'var(--button-secondary-bg)';
  }}
>
  キャンセル
</button>
```

### 5. テキストエリア

```tsx
<textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="内容を入力してください"
  rows={5}
  style={{
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid var(--input-border)',
    borderRadius: 12,
    background: 'var(--input-bg)',
    color: 'var(--input-text)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = 'var(--input-border-focus)';
  }}
  onBlur={(e) => {
    e.target.style.borderColor = 'var(--input-border)';
  }}
/>
```

---

## NG パターン

### ❌ ハードコードされた色

```tsx
// ダメな例
<input
  style={{
    background: '#ffffff',  // ハードコード
    color: '#000000',       // ハードコード
    border: '1px solid #e2e8f0'  // ハードコード
  }}
/>
```

### ❌ ダークモード非対応

```tsx
// ダメな例
<button
  style={{
    background: '#0084c7',  // ライトモードのみ
    color: '#fff'
  }}
/>
```

---

## チェックリスト

新しいUIコンポーネントを作成する際は、以下を確認してください：

- [ ] ハードコードされた色を使用していない
- [ ] すべての色がCSS変数（`var(--*)）を使用している
- [ ] ライトモードで視認性が良い
- [ ] ダークモードで視認性が良い
- [ ] フォーカス状態が明確
- [ ] ホバー状態が明確
- [ ] 無効化状態が明確
- [ ] トランジションが滑らか（0.2s推奨）

---

## 既存コードの修正方法

既存のハードコードされた色を修正する手順：

1. **ハードコードされた色を検索**
   ```bash
   grep -r "color.*#\|background.*#\|border.*#" src/
   ```

2. **適切なCSS変数に置き換え**
   - 入力フォーム → `--input-*` を使用
   - ボタン → `--button-*` を使用
   - 一般的な背景 → `--surface` または `--bg` を使用
   - テキスト → `--ink` または `--muted` を使用

3. **動作確認**
   - ライトモードで確認
   - ダークモードで確認
   - フォーカス/ホバー状態を確認

---

## よくある質問

### Q: 特殊な色が必要な場合は？

A: まず既存のCSS変数で対応できないか検討してください。どうしても必要な場合は、`tokens.css`に新しい変数を追加し、ライト/ダーク両方のモードで定義してください。

### Q: グラデーションは使える？

A: 使用可能ですが、ダークモードでも視認性が保たれるように注意してください。可能であれば単色を推奨します。

### Q: 透明度は使える？

A: 使用可能です。`rgba()`や`opacity`を使用できますが、背景との組み合わせでコントラストが十分か確認してください。

---

## 今後の改善予定

- [ ] 全ページのハードコードされた色をCSS変数に置き換え（185箇所）
- [ ] コンポーネントライブラリの作成（Button, Input, Selectなど）
- [ ] Storybookによるコンポーネントカタログの作成
- [ ] アクセシビリティ（WCAG 2.1 AA準拠）の確認
