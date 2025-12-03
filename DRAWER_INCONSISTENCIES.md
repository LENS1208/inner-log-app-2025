# ドロワーコンポーネントの統一ルールからの逸脱点

現在のドロワーコンポーネントで統一されていない箇所のリストです。

## 1. zIndex値の不統一

**標準値（MonthlyReviewDrawer）:**
- オーバーレイ: `9998`
- ドロワー本体: `9999`

**逸脱しているファイル:**
- `WeeklyDetailDrawer.tsx`: オーバーレイ `999`、ドロワー `1000`

**影響:** 他のドロワーと重なったときに表示順序が不安定になる可能性

---

## 2. ドロワー幅の不統一

**標準値（MonthlyReviewDrawer）:**
- width: `50%`
- minWidth: `800px`
- maxWidth: `1000px`

**逸脱しているファイル:**
- `SetupDetailDrawer.tsx`: width `40%`, minWidth `600px`, maxWidth `800px`
- `WeeklyDetailDrawer.tsx`: width `40%`, minWidth `400px`, maxWidth `800px`
- その他多数のDetailDrawerも `40%` / `600px` を使用

**影響:** ドロワーごとに表示サイズが異なり、UX が不統一

---

## 3. boxShadowの不統一

**標準値（MonthlyReviewDrawer & SetupDetailDrawer）:**
- boxShadow: `-4px 0 20px rgba(0, 0, 0, 0.3)`

**逸脱しているファイル:**
- `WeeklyDetailDrawer.tsx`: `-4px 0 12px rgba(0,0,0,0.15)` (薄すぎる)

**影響:** 視覚的な深度感が弱く、背景との分離が不明瞭

---

## 4. タイトルフォントサイズの不統一

**標準値（MonthlyReviewDrawer & 多数のDetailDrawer）:**
- h2タイトル: `fontSize: 20`

**逸脱しているファイル:**
- `WeeklyDetailDrawer.tsx`: `fontSize: 18` (h2)
- `HoldingTimeDetailDrawer.tsx`: `fontSize: 18` (h2)

**影響:** タイトルの視覚的重要度が統一されていない

---

## 5. ヘッダー構造の不統一

**標準パターン（MonthlyReviewDrawer）:**
```tsx
<div style={{ padding: 24 }}>
  <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          タイトル
        </h2>
      </div>
      <button>閉じる</button>
    </div>
  </div>
  {content}
</div>
```

**逸脱パターン（WeeklyDetailDrawer）:**
- stickyヘッダー使用: `position: 'sticky', top: 0`
- padding値が異なる: `padding: 16` (標準は `24`)

**影響:** スクロール挙動が異なる、視覚的一貫性の欠如

---

## 6. アニメーション定義の重複

**問題点:**
- 一部のファイルが `<style>` タグでアニメーション定義を埋め込んでいる
- 他のファイルはグローバルCSSに依存

**逸脱しているファイル:**
- `WeeklyDetailDrawer.tsx`: 244-249行目に `@keyframes slideInRight` を定義

**影響:** コードの重複、メンテナンス性の低下

---

## 推奨される統一ルール

### ドロワー本体のスタイル
```tsx
{
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '50%',
  minWidth: 800,
  maxWidth: 1000,
  background: 'var(--surface)',
  zIndex: 9999,
  overflowY: 'auto',
  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
  animation: 'slideInRight 0.3s ease-out',
  outline: 'none',
}
```

### オーバーレイのスタイル
```tsx
{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 9998,
}
```

### ヘッダー構造
```tsx
<div style={{ padding: 24 }}>
  <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          タイトル
        </h2>
      </div>
      <button style={{ /* 閉じるボタンの統一スタイル */ }}>
        閉じる
      </button>
    </div>
  </div>
  {/* コンテンツ */}
</div>
```

### その他
- アニメーションは`index.css`などのグローバルCSSに定義し、重複を避ける
- `tabIndex={-1}` と `outline: 'none'` でフォーカス管理を統一
- Escapeキーハンドリングを全ドロワーで実装
