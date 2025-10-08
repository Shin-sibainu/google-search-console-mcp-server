# Google Search Console MCP Server - 要件定義・仕様書

## 1. プロジェクト概要

### 1.1 目的
Google Search Console APIをMCP (Model Context Protocol) サーバーとして実装し、Claude CodeやCursorから直接Search Consoleのデータにアクセス・分析できるようにする。

### 1.2 ターゲットユーザー
- SEO担当者
- Webサイト運営者
- 開発者
- コンテンツマーケター

### 1.3 主な利用シーン
- SEOパフォーマンスのモニタリング
- 検索クエリ分析
- インデックス状態の確認
- サイトマップの検証
- レポート自動生成

---

## 2. システム構成

### 2.1 技術スタック
- **言語**: TypeScript
- **ランタイム**: Node.js (v18以上)
- **主要ライブラリ**:
  - `@modelcontextprotocol/sdk`: MCP SDK
  - `googleapis`: Google API クライアント
  - `dotenv`: 環境変数管理

### 2.2 ディレクトリ構造
```
mcp-server/google-search-console-mcp-server/
├── src/
│   ├── index.ts                    # メインエントリーポイント
│   ├── auth/
│   │   ├── google-auth.ts          # Google OAuth認証
│   │   └── setup-auth.ts           # 初回認証セットアップ
│   ├── tools/
│   │   ├── list-sites.ts           # サイト一覧取得
│   │   ├── get-analytics.ts        # 検索分析データ取得
│   │   ├── get-sitemaps.ts         # サイトマップ情報取得
│   │   └── inspect-url.ts          # URL検査
│   └── types/
│       └── index.ts                # 型定義
├── build/                          # ビルド出力先
├── package.json
├── tsconfig.json
├── .env.example                    # 環境変数のサンプル
└── README.md
```

---

## 3. 認証仕様

### 3.1 認証方式
Google OAuth 2.0を使用

### 3.2 必要な認証情報
```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
GOOGLE_REFRESH_TOKEN=xxxxx  # 初回認証後に取得
```

### 3.3 必要なスコープ
- `https://www.googleapis.com/auth/webmasters.readonly` (読み取り専用)
- `https://www.googleapis.com/auth/webmasters` (読み書き)

### 3.4 認証フロー
1. ユーザーがGoogle Cloud Consoleでプロジェクトを作成
2. OAuth 2.0クライアントIDを作成
3. `setup-auth.ts`を実行して認証URLを取得
4. ブラウザで認証し、認証コードを取得
5. 認証コードからリフレッシュトークンを生成
6. リフレッシュトークンを環境変数に設定

---

## 4. MCP ツール仕様

### 4.1 list_sites
**説明**: ユーザーがアクセス可能なすべてのSearch Consoleサイトを取得

**入力パラメータ**: なし

**出力**:
```typescript
{
  sites: [
    {
      siteUrl: string,        // 例: "https://example.com/"
      permissionLevel: string // "siteOwner", "siteFullUser", "siteRestrictedUser"
    }
  ]
}
```

**実装ファイル**: `src/tools/list-sites.ts`

---

### 4.2 get_analytics
**説明**: 指定期間の検索パフォーマンスデータを取得

**入力パラメータ**:
```typescript
{
  siteUrl: string,           // 必須: サイトURL
  startDate: string,         // 必須: 開始日 (YYYY-MM-DD)
  endDate: string,           // 必須: 終了日 (YYYY-MM-DD)
  dimensions?: string[],     // オプション: ["query", "page", "country", "device", "searchAppearance"]
  rowLimit?: number,         // オプション: 取得行数 (デフォルト: 100, 最大: 25000)
  startRow?: number          // オプション: 開始行 (ページネーション用)
}
```

**出力**:
```typescript
{
  rows: [
    {
      keys?: string[],       // dimensionsで指定した値
      clicks: number,        // クリック数
      impressions: number,   // インプレッション数
      ctr: number,          // クリック率 (0-1)
      position: number       // 平均掲載順位
    }
  ],
  responseAggregationType: string
}
```

**実装ファイル**: `src/tools/get-analytics.ts`

**使用例**:
- クエリ別の分析: `dimensions: ["query"]`
- ページとデバイス別: `dimensions: ["page", "device"]`
- 国別の分析: `dimensions: ["country"]`

---

### 4.3 get_sitemaps
**説明**: サイトのサイトマップ情報を取得

**入力パラメータ**:
```typescript
{
  siteUrl: string  // 必須: サイトURL
}
```

**出力**:
```typescript
{
  sitemap: [
    {
      path: string,              // サイトマップのURL
      lastSubmitted: string,     // 最終送信日時
      isPending: boolean,        // 処理中かどうか
      isSitemapsIndex: boolean,  // サイトマップインデックスか
      type: string,              // "WEB", "IMAGE", "VIDEO", etc.
      warnings: string[],        // 警告
      errors: string[],          // エラー
      contents: [                // サイトマップの内容
        {
          type: string,
          submitted: string,     // 送信されたURL数
          indexed: string        // インデックスされたURL数
        }
      ]
    }
  ]
}
```

**実装ファイル**: `src/tools/get-sitemaps.ts`

---

### 4.4 inspect_url
**説明**: 特定のURLのインデックス状態を検査

**入力パラメータ**:
```typescript
{
  siteUrl: string,        // 必須: サイトURL
  inspectionUrl: string   // 必須: 検査するURL
}
```

**出力**:
```typescript
{
  inspectionResult: {
    indexStatusResult: {
      verdict: string,           // "PASS", "FAIL", "NEUTRAL"
      coverageState: string,     // インデックス状態
      robotsTxtState: string,    // robots.txtの状態
      indexingState: string,     // インデックス状態
      lastCrawlTime: string,     // 最終クロール日時
      pageFetchState: string,    // ページ取得状態
      googleCanonical: string,   // Googleが認識した正規URL
      userCanonical: string,     // ユーザーが宣言した正規URL
      crawledAs: string          // クロール時のユーザーエージェント
    },
    mobileUsabilityResult?: {
      verdict: string,
      issues: [                  // モバイルユーザビリティの問題
        {
          issueType: string,
          message: string
        }
      ]
    },
    richResultsResult?: {
      verdict: string,
      detectedItems: [           // 検出されたリッチリザルト
        {
          richResultType: string,
          items: []
        }
      ]
    }
  }
}
```

**実装ファイル**: `src/tools/inspect-url.ts`

---

## 5. エラーハンドリング

### 5.1 認証エラー
- トークンが無効または期限切れの場合
- スコープが不足している場合
- 環境変数が設定されていない場合

**対応**: エラーメッセージを返し、認証手順を案内

### 5.2 APIエラー
- レート制限に達した場合
- サイトへのアクセス権限がない場合
- 無効なパラメータが指定された場合

**対応**: 詳細なエラーメッセージを返す

### 5.3 ネットワークエラー
- APIへの接続失敗
- タイムアウト

**対応**: リトライロジックまたはエラーメッセージ

---

## 6. 配布形式

### 6.1 NPMパッケージとして公開
```bash
npm install -g @your-username/google-search-console-mcp-server
```

### 6.2 npx経由での実行
```bash
npx @your-username/google-search-console-mcp-server
```

### 6.3 Claude Desktop / Cursor の設定例
```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": [
        "@your-username/google-search-console-mcp-server"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

---

## 7. package.json 設定

```json
{
  "name": "@your-username/google-search-console-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Google Search Console API",
  "type": "module",
  "bin": {
    "google-search-console-mcp": "./build/index.js"
  },
  "main": "./build/index.js",
  "scripts": {
    "build": "tsc && chmod +x ./build/index.js",
    "prepare": "npm run build",
    "dev": "tsc --watch",
    "setup-auth": "node --loader ts-node/esm src/auth/setup-auth.ts"
  },
  "keywords": [
    "mcp",
    "google-search-console",
    "claude",
    "ai",
    "seo"
  ],
  "author": "Your Name",
  "license": "MIT",
  "files": [
    "build",
    "README.md",
    ".env.example"
  ],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "googleapis": "^144.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 8. tsconfig.json 設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

---

## 9. 実装の優先順位

### Phase 1: 基本機能 (MVP)
1. ✅ プロジェクトセットアップ
2. ✅ 認証システム (google-auth.ts)
3. ✅ MCPサーバー基盤 (index.ts)
4. ✅ list_sites ツール
5. ✅ get_analytics ツール

### Phase 2: 追加機能
6. ✅ get_sitemaps ツール
7. ✅ inspect_url ツール

### Phase 3: 改善・最適化
8. エラーハンドリングの強化
9. レート制限対応
10. テストコードの追加
11. ドキュメント整備

---

## 10. README.md に含めるべき内容

1. **インストール方法**
2. **Google Cloud Consoleでの設定手順**
3. **初回認証の手順**
4. **Claude Desktop / Cursor での設定例**
5. **利用可能なツール一覧と使用例**
6. **トラブルシューティング**
7. **ライセンス情報**

---

## 11. 使用例

### 例1: サイト一覧の取得
```
User: "アクセスできるSearch Consoleのサイトを教えて"
Claude: (list_sitesを実行)
  - https://example.com/ (Owner)
  - https://blog.example.com/ (Full User)
```

### 例2: 検索パフォーマンスの分析
```
User: "example.comの先週のトップ10クエリを教えて"
Claude: (get_analyticsを実行)
  1. "Python tutorial" - 1,234クリック, CTR 5.2%, 順位 4.3
  2. "Learn Python" - 987クリック, CTR 4.8%, 順位 5.1
  ...
```

### 例3: インデックス問題の確認
```
User: "https://example.com/new-page がインデックスされているか確認して"
Claude: (inspect_urlを実行)
  - インデックス状態: インデックス未登録
  - 理由: クロール待ち
  - 最終クロール: 2025-10-01
```

---

## 12. セキュリティ考慮事項

1. **環境変数の保護**
   - `.env`ファイルを`.gitignore`に追加
   - リフレッシュトークンを安全に保管

2. **スコープの最小化**
   - 読み取り専用操作には`webmasters.readonly`のみ使用

3. **エラーメッセージ**
   - 機密情報を含めない
   - ユーザーフレンドリーなメッセージ

---

## 13. 今後の拡張案

1. **追加ツール**
   - `submit_url`: URL のインデックス登録リクエスト
   - `remove_url`: URL の削除リクエスト
   - `get_search_appearance`: 検索での見え方データ取得

2. **機能拡張**
   - データのキャッシング
   - バッチ処理対応
   - Webhook通知

3. **分析機能**
   - トレンド分析
   - 競合比較
   - アラート機能

---

## 14. 参考リンク

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

---

## 15. ライセンス

MIT License