# 開発ガイド

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成:

```bash
cp .env.example .env
```

`.env`ファイルを編集:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 3. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. Search Console APIを有効化
3. OAuth 2.0クライアントID作成（アプリケーションの種類: デスクトップアプリ）
4. クライアントIDとシークレットを取得

### 4. 初回認証

```bash
npm run setup-auth
```

1. 表示されたURLをブラウザで開く
2. Googleアカウントでログイン・承認
3. 認証コードをコピー
4. ターミナルに認証コードを貼り付け
5. 生成されたリフレッシュトークンを`.env`に保存

## 開発コマンド

```bash
# ビルド
npm run build

# 開発モード（ウォッチモード）
npm run dev

# ローカルでMCPサーバーを起動
node build/index.js
```

## コーディング規約

### TypeScript設定

- **Target**: ES2022
- **Module**: Node16
- **Strict mode**: 有効
- **ESM形式**: `import`/`export`を使用（`require`は使わない）

### ファイル構成

```
src/
├── index.ts              # MCPサーバーのメインエントリー
├── auth/                 # 認証関連
├── tools/                # MCPツール実装
└── types/                # 型定義
```

### 新しいMCPツールの追加方法

1. `src/tools/`に新しいファイルを作成
2. 以下の構造で実装:

```typescript
import { z } from 'zod';

export const toolName = 'tool_name';

export const toolDescription = 'ツールの説明';

export const toolInputSchema = z.object({
  param1: z.string().describe('パラメータ1の説明'),
  param2: z.number().optional().describe('パラメータ2の説明（オプション）'),
});

export async function toolHandler(args: z.infer<typeof toolInputSchema>, authClient: any) {
  // Google Search Console API呼び出し
  // 結果を返す
}
```

3. `src/index.ts`でツールを登録

## テスト方法

### ローカルでのMCPサーバーテスト

1. ビルド後、手動で起動:

```bash
npm run build
node build/index.js
```

2. MCPクライアント（Claude Desktop/Cursor）で設定:

```json
{
  "mcpServers": {
    "google-search-console-dev": {
      "command": "node",
      "args": ["C:/path/to/build/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

### API呼び出しのデバッグ

`src/tools/`内で`console.error()`を使用してデバッグ:

```typescript
console.error('[DEBUG] API Response:', response.data);
```

## エラーハンドリング

### 認証エラー

- トークン期限切れ → 自動的にリフレッシュ
- スコープ不足 → エラーメッセージで必要なスコープを案内

### APIエラー

```typescript
try {
  const response = await searchconsole.sites.list();
  return response.data;
} catch (error: any) {
  if (error.code === 403) {
    throw new Error('アクセス権限がありません');
  }
  throw new Error(`API Error: ${error.message}`);
}
```

## Google Search Console API参考

### 主要なAPI

- `searchconsole.sites.list()` - サイト一覧
- `searchconsole.searchanalytics.query()` - 検索分析
- `searchconsole.sitemaps.list()` - サイトマップ一覧
- `searchconsole.urlInspection.index.inspect()` - URL検査

### レート制限

- 1日あたり: 2,000リクエスト（プロジェクトごと）
- 100秒あたり: 600リクエスト

対策: リクエスト間隔を制御、エラー時はリトライ

## NPM公開前のチェックリスト

- [ ] `package.json`のバージョン確認
- [ ] `build/`ディレクトリが正しくビルドされている
- [ ] `build/index.js`に実行権限がある（`chmod +x`）
- [ ] README.mdが完成している
- [ ] `.npmignore`または`package.json`の`files`が正しい
- [ ] ローカルで`npx .`が動作する

## トラブルシューティング

### "Module not found"エラー

→ `tsconfig.json`で`moduleResolution: "Node16"`を確認

### 認証エラー

→ `.env`ファイルが正しく読み込まれているか確認
→ リフレッシュトークンが有効か確認

### MCPサーバーが起動しない

→ `build/index.js`の1行目に`#!/usr/bin/env node`があるか確認
→ `package.json`の`bin`設定を確認
