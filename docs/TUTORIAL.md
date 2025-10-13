# Google Search Console MCP Server の作り方

## はじめに

この記事では、Google Search Console API を Claude から利用できるようにする MCP (Model Context Protocol) サーバーの実装方法を解説します。

### MCPとは？

MCP (Model Context Protocol) は、AI アシスタントが外部ツールやデータソースにアクセスするための標準プロトコルです。MCP サーバーを作成することで、Claude や他の AI アシスタントから様々な API を利用できるようになります。

### 完成イメージ

ユーザーが Claude に「Search Console のサイト一覧を教えて」と聞くと、自動的に Google Search Console API を呼び出してデータを取得してくれる、そんな仕組みを作ります。

## プロジェクトの構成

### 技術スタック

- **TypeScript** - 型安全性と開発体験の向上
- **Node.js v18+** - ランタイム環境
- **ESM** - モダンな JavaScript モジュールシステム
- **googleapis** - Google API クライアント
- **@modelcontextprotocol/sdk** - MCP プロトコル実装

### ディレクトリ構造

```
src/
├── index.ts                 # MCPサーバーのエントリーポイント
├── auth/
│   ├── google-auth.ts       # Google OAuth 2.0 認証
│   └── setup-auth.ts        # 認証セットアップCLI
├── tools/
│   ├── list-sites.ts        # サイト一覧取得ツール
│   ├── get-analytics.ts     # 検索パフォーマンスデータ取得
│   ├── get-sitemaps.ts      # サイトマップ情報取得
│   ├── inspect-url.ts       # URL検査
│   ├── submit-url.ts        # URL インデックス送信
│   └── compare-periods.ts   # 期間比較
├── types/
│   └── index.ts             # 型定義
└── utils/
    └── error-handler.ts     # エラーハンドリング
```

## Step 1: プロジェクトのセットアップ

### package.json の作成

```json
{
  "name": "google-search-console-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "google-search-console-mcp": "./build/index.js",
    "google-search-console-mcp-setup": "./build/auth/setup-auth.js"
  },
  "main": "./build/index.js",
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('./build/index.js', '755'); require('fs').chmodSync('./build/auth/setup-auth.js', '755')\"",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "googleapis": "^144.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  }
}
```

**ポイント**:
- `"type": "module"` で ESM を使用
- `bin` フィールドで実行可能なコマンドを定義
- ビルドスクリプトで実行権限を付与

### TypeScript 設定

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
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Step 2: Google OAuth 認証の実装

### 認証クライアントの作成

`src/auth/google-auth.ts`:

```typescript
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export function createAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  if (refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  return oauth2Client;
}

export function getAuthUrl(oauth2Client) {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/indexing',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(oauth2Client, code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}
```

**重要なポイント**:

1. **Refresh Token の使用**: Access Token は1時間で期限切れになるため、Refresh Token を使って自動的に更新します
2. **複数のスコープ**: 読み取り専用、書き込み、インデックス送信の3つのスコープを要求
3. **デフォルト値**: REDIRECT_URI にデフォルト値を設定してユーザーの設定を簡略化

### 対話型セットアップコマンド

`src/auth/setup-auth.ts`:

```typescript
#!/usr/bin/env node

import http from 'http';
import { URL } from 'url';
import readline from 'readline';
import { google } from 'googleapis';
import { getAuthUrl, getTokensFromCode } from './google-auth.js';

function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} (default: ${defaultValue}): `
      : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function main() {
  console.log('Google Search Console MCP Server - Authentication Setup');
  console.log();
  console.log('Enter your Google OAuth credentials:');

  // 対話形式で認証情報を取得
  const clientId = await prompt('GOOGLE_CLIENT_ID');
  const clientSecret = await prompt('GOOGLE_CLIENT_SECRET');
  const redirectUri = await prompt('GOOGLE_REDIRECT_URI', 'http://localhost:8080');

  const PORT = parseInt(new URL(redirectUri).port || '8080', 10);

  // OAuth2 クライアントを作成
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = getAuthUrl(oauth2Client);

  console.log();
  console.log('Visit this URL in your browser:');
  console.log(authUrl);
  console.log();
  console.log(`Waiting for authorization on ${redirectUri}...`);

  // ローカルサーバーで認証コードを受け取る
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${PORT}`);
      const authCode = url.searchParams.get('code');

      if (authCode) {
        res.end('<h1>Authorization successful!</h1><p>Return to terminal.</p>');
        server.close();
        resolve(authCode);
      } else {
        res.end('<h1>Authorization failed</h1>');
        server.close();
        reject(new Error('No authorization code received'));
      }
    });

    server.listen(PORT);
  });

  // トークンを取得
  const tokens = await getTokensFromCode(oauth2Client, code);

  // .mcp.json の完全な設定を出力
  console.log();
  console.log('Success! Add this to your .mcp.json:');
  console.log();
  console.log(JSON.stringify({
    mcpServers: {
      'google-search-console': {
        command: 'npx',
        args: ['google-search-console-mcp-server'],
        env: {
          GOOGLE_CLIENT_ID: clientId,
          GOOGLE_CLIENT_SECRET: clientSecret,
          GOOGLE_REFRESH_TOKEN: tokens.refresh_token
        }
      }
    }
  }, null, 2));
}

main().catch(console.error);
```

**ユーザー体験のポイント**:
- 環境変数の export が不要
- 完全な `.mcp.json` 設定を自動生成
- コピペですぐに使える

## Step 3: MCP サーバーの実装

### メインサーバー

`src/index.ts`:

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createAuthClient } from './auth/google-auth.js';
import * as listSites from './tools/list-sites.js';
import * as getAnalytics from './tools/get-analytics.js';
// ... 他のツールをインポート

const authClient = createAuthClient();

// ツールを定義
const tools = [
  {
    name: listSites.name,
    description: listSites.description,
    inputSchema: listSites.inputSchema,
    handler: listSites.handler,
  },
  // ... 他のツール
];

// MCP サーバーを作成
const server = new Server(
  {
    name: 'google-search-console-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// ツールを実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);

  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  return await tool.handler(request.params.arguments, authClient);
});

// サーバーを起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP Server running on stdio');
}

main().catch(console.error);
```

**MCP サーバーの仕組み**:

1. **ListToolsRequest**: Claude が利用可能なツールの一覧を取得
2. **CallToolRequest**: Claude が特定のツールを実行
3. **stdio transport**: 標準入出力を使って Claude と通信

## Step 4: ツールの実装

### 基本的なツール構造

各ツールは以下の3つを export します：

1. **name**: ツール名
2. **description**: ツールの説明（Claude がツールを選択する際の判断材料）
3. **inputSchema**: 入力パラメータのスキーマ（JSON Schema形式）
4. **handler**: 実際の処理

### 例: サイト一覧取得ツール

`src/tools/list-sites.ts`:

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from '../types/index.js';
import { handleApiError, retryWithBackoff } from '../utils/error-handler.js';

export const name = 'list_sites';

export const description =
  'List all Google Search Console sites you have access to';

export const inputSchema = {
  type: 'object',
  properties: {},
  required: [],
};

export async function handler(args: any, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.sites.list();
    });

    const sites = response.data.siteEntry || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sites: sites.map(site => ({
              siteUrl: site.siteUrl,
              permissionLevel: site.permissionLevel,
            })),
            totalSites: sites.length,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    handleApiError(error, 'list sites');
  }
}
```

### 例: 検索パフォーマンスデータ取得

`src/tools/get-analytics.ts`:

```typescript
export const name = 'get_analytics';

export const description =
  'Query search performance data from Google Search Console for a specified date range';

export const inputSchema = {
  type: 'object',
  properties: {
    siteUrl: {
      type: 'string',
      description: 'The site URL (e.g., "https://example.com/")',
    },
    startDate: {
      type: 'string',
      description: 'Start date in YYYY-MM-DD format',
    },
    endDate: {
      type: 'string',
      description: 'End date in YYYY-MM-DD format',
    },
    dimensions: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['query', 'page', 'country', 'device', 'searchAppearance'],
      },
      description: 'Dimensions to group results by',
    },
    rowLimit: {
      type: 'number',
      description: 'Maximum number of rows (default: 100, max: 25000)',
      default: 100,
    },
  },
  required: ['siteUrl', 'startDate', 'endDate'],
};

export async function handler(args: AnalyticsRequest, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  // 入力バリデーション
  validateSiteUrl(args.siteUrl);
  validateDateRange(args.startDate, args.endDate);

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.searchanalytics.query({
        siteUrl: args.siteUrl,
        requestBody: {
          startDate: args.startDate,
          endDate: args.endDate,
          dimensions: args.dimensions || [],
          rowLimit: args.rowLimit || 100,
        },
      });
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            rows: response.data.rows || [],
            totalRows: response.data.rows?.length || 0,
            dateRange: { startDate: args.startDate, endDate: args.endDate },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    handleApiError(error, 'get analytics data');
  }
}
```

## Step 5: エラーハンドリングとリトライロジック

### カスタムエラークラス

`src/utils/error-handler.ts`:

```typescript
export class SearchConsoleError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'SearchConsoleError';
  }
}

export function handleApiError(error: any, context: string): never {
  const errorCode = error.code || error.response?.status;

  switch (errorCode) {
    case 401:
    case 403:
      throw new SearchConsoleError(
        `Access denied for ${context}`,
        errorCode,
        'Verify your authentication credentials and ensure you have access to this property.'
      );

    case 429:
      throw new SearchConsoleError(
        `Rate limit exceeded for ${context}`,
        429,
        'Too many requests. Please wait and try again. Daily quota: 2,000 requests.'
      );

    case 500:
    case 502:
    case 503:
      throw new SearchConsoleError(
        `Google API server error for ${context}`,
        errorCode,
        'The Google API is temporarily unavailable. Please try again later.'
      );

    default:
      throw new SearchConsoleError(
        `Failed to ${context}: ${error.message}`,
        errorCode,
        'An unexpected error occurred'
      );
  }
}
```

### リトライロジック（Exponential Backoff）

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 4xx エラー（429以外）はリトライしない
      const errorCode = error.code || error.response?.status;
      if (errorCode && errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
        throw error;
      }

      // 最後の試行ではリトライしない
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff + Jitter
      const delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;

      console.error(`Attempt ${attempt + 1} failed, retrying in ${delay + jitter}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}
```

**重要なポイント**:

1. **Exponential Backoff**: リトライごとに待機時間を2倍にする
2. **Jitter**: ランダムな待機時間を追加してサーバー負荷を分散
3. **スマートリトライ**: クライアントエラー（4xx）はリトライしない（429を除く）

### バリデーション関数

```typescript
export function validateSiteUrl(siteUrl: string): void {
  if (!siteUrl) {
    throw new SearchConsoleError(
      'Site URL is required',
      400,
      'Please provide a valid site URL'
    );
  }

  try {
    new URL(siteUrl);
  } catch {
    throw new SearchConsoleError(
      'Invalid site URL format',
      400,
      'Site URL must be a valid URL'
    );
  }
}

export function validateDateRange(startDate: string, endDate: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new SearchConsoleError(
      'Invalid date format',
      400,
      'Dates must be in YYYY-MM-DD format'
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new SearchConsoleError(
      'Invalid date range',
      400,
      'startDate must be before or equal to endDate'
    );
  }

  // 16ヶ月制限のチェック
  const sixteenMonthsAgo = new Date();
  sixteenMonthsAgo.setMonth(sixteenMonthsAgo.getMonth() - 16);

  if (start < sixteenMonthsAgo) {
    throw new SearchConsoleError(
      'Date range too old',
      400,
      'Search Console data is only available for the last 16 months'
    );
  }
}
```

## Step 6: 型定義

`src/types/index.ts`:

```typescript
export type OAuth2Client = any; // googleapis の OAuth2Client

export interface AnalyticsRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
}

export interface AnalyticsResponse {
  rows: {
    keys?: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  responseAggregationType?: string;
}

// 他の型定義...
```

## Step 7: ビルドと公開

### ビルドスクリプト

```json
{
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('./build/index.js', '755'); require('fs').chmodSync('./build/auth/setup-auth.js', '755')\""
  }
}
```

ビルド後に実行権限を付与することで、`npx` コマンドから直接実行可能になります。

### .npmignore

```
src/
tsconfig.json
.env
.env.local
.mcp.json
*.log
node_modules/
```

ソースコードは含めず、ビルド済みファイルのみを公開します。

### NPM への公開

```bash
npm run build
npm publish
```

## Step 8: 使用方法

### 初回セットアップ

```bash
# セットアップコマンドを実行
npx -y -p google-search-console-mcp-server google-search-console-mcp-setup

# プロンプトに従って入力
GOOGLE_CLIENT_ID: [GCPから取得したID]
GOOGLE_CLIENT_SECRET: [GCPから取得したSecret]
GOOGLE_REDIRECT_URI: [Enterでデフォルト]

# ブラウザで認証

# 出力された .mcp.json の設定をコピー
```

### .mcp.json の設定

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["google-search-console-mcp-server"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

### Claude での使用例

```
Search Consoleのサイト一覧を教えて

example.comの過去7日間のトップクエリを取得して

example.comの今週と先週のパフォーマンスを比較して
```

## まとめ

### 実装のポイント

1. **OAuth 2.0 認証**
   - Refresh Token を使った永続的な認証
   - 対話型セットアップコマンドでユーザー体験を向上

2. **堅牢なエラーハンドリング**
   - カスタムエラークラスで詳細な情報を提供
   - Exponential Backoff によるリトライロジック
   - 入力バリデーションでエラーを事前に防止

3. **使いやすいツール設計**
   - JSON Schema による型安全な入力
   - わかりやすい description で Claude が適切に選択
   - 構造化された出力で解析しやすい

4. **開発者体験**
   - TypeScript で型安全性を確保
   - ESM で最新の JavaScript 標準に準拠
   - 明確なディレクトリ構造で保守しやすい

### さらなる改善案

- **テストの追加**: Jest や Vitest でユニットテスト
- **ロギング**: Winston や Pino で構造化ログ
- **設定ファイル**: ユーザーがカスタマイズ可能な設定
- **キャッシング**: よく使うデータをキャッシュして高速化
- **ドキュメント**: API リファレンスや詳細なガイド

## 参考リンク

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [Google Search Console API](https://developers.google.com/webmaster-tools/search-console-api-original)
- [googleapis ライブラリ](https://github.com/googleapis/google-api-nodejs-client)
- [完成版リポジトリ](https://github.com/Shin-sibainu/google-search-console-mcp-server)

---

この記事が MCP サーバー開発の参考になれば幸いです。質問や改善案があれば、GitHub の Issues でお知らせください！
