# FXトレーディングジャーナル

トレーディングジャーナルとAI分析機能を備えたFXトレーディングアプリケーション。

## AI機能の設定

AI予想生成機能を使用するには、SupabaseダッシュボードでOpenAI APIキーを設定する必要があります。

### 手順

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「Edge Functions」を選択
4. 右上の「Settings」（歯車アイコン）をクリック
5. 「Secrets」セクションで、以下の環境変数を追加：
   - Name: `OPENAI_API_KEY`
   - Value: あなたのOpenAI APIキー（[OpenAI Platform](https://platform.openai.com/api-keys)から取得）
6. 「Save」をクリック

設定後、Edge Functionを再デプロイする必要がある場合があります。

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available: 

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler  
 
The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration
　
If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules: 

```js　　
export default defineConfig([ 
  globalIgnores(['dist']),　 
  {　 
    files: ['**/*.{ts,tsx}'],　　 
    extends: [ 
      // Other configs...　　

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: { 
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  }, 
])
```
G
You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
