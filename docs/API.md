# API リファレンス

このドキュメントは、Google Search Console MCP Serverが提供するMCPツールの詳細仕様です。

## 共通仕様

### 認証

すべてのツールは、環境変数で設定されたGoogle OAuth 2.0認証を使用します。

### エラーレスポンス

エラー時は以下の形式でメッセージを返します:

```json
{
  "error": "エラーの内容",
  "code": "ERROR_CODE"
}
```

---

## ツール一覧

### 1. list_sites

ユーザーがアクセス可能なすべてのSearch Consoleサイトを取得します。

**Tool Name**: `list_sites`

**Input Parameters**: なし

**Output**:

```typescript
{
  sites: Array<{
    siteUrl: string;        // サイトURL（例: "https://example.com/"）
    permissionLevel: string; // 権限レベル
  }>
}
```

**Permission Levels**:
- `siteOwner` - オーナー
- `siteFullUser` - フルユーザー
- `siteRestrictedUser` - 制限付きユーザー

**使用例**:

Claude/Cursorでの利用:
```
アクセスできるSearch Consoleのサイトを教えて
```

**実装パス**: `src/tools/list-sites.ts`

---

### 2. get_analytics

指定期間の検索パフォーマンスデータを取得します。

**Tool Name**: `get_analytics`

**Input Parameters**:

```typescript
{
  siteUrl: string;           // 必須: サイトURL（例: "https://example.com/"）
  startDate: string;         // 必須: 開始日（YYYY-MM-DD形式）
  endDate: string;           // 必須: 終了日（YYYY-MM-DD形式）
  dimensions?: string[];     // オプション: ディメンション配列
  rowLimit?: number;         // オプション: 取得行数（デフォルト: 100, 最大: 25000）
  startRow?: number;         // オプション: 開始行（ページネーション用）
}
```

**Available Dimensions**:
- `query` - 検索クエリ
- `page` - ページURL
- `country` - 国（ISO 3166-1 alpha-3形式）
- `device` - デバイス（DESKTOP, MOBILE, TABLET）
- `searchAppearance` - 検索での見え方

**Output**:

```typescript
{
  rows: Array<{
    keys?: string[];       // ディメンションの値（dimensionsを指定した場合）
    clicks: number;        // クリック数
    impressions: number;   // インプレッション数
    ctr: number;          // クリック率（0〜1の小数）
    position: number;      // 平均掲載順位（1から始まる）
  }>,
  responseAggregationType: string; // "auto", "byProperty", "byPage"
}
```

**使用例**:

```
# 基本的な使用
example.comの過去7日間のトップクエリを教えて

# ディメンション指定
example.comの先月のページ別とデバイス別のパフォーマンスを教えて

# 詳細な分析
example.comの2025年9月1日から9月30日までの、
国別とクエリ別のデータを1000件取得して
```

**データ制限**:
- 最大16ヶ月前までのデータを取得可能
- `rowLimit`は最大25,000
- 複数ディメンション指定時は組み合わせ数に注意

**実装パス**: `src/tools/get-analytics.ts`

---

### 3. get_sitemaps

サイトのサイトマップ情報を取得します。

**Tool Name**: `get_sitemaps`

**Input Parameters**:

```typescript
{
  siteUrl: string;  // 必須: サイトURL
}
```

**Output**:

```typescript
{
  sitemap: Array<{
    path: string;              // サイトマップのURL
    lastSubmitted: string;     // 最終送信日時（ISO 8601形式）
    isPending: boolean;        // 処理中かどうか
    isSitemapsIndex: boolean;  // サイトマップインデックスか
    type: string;              // タイプ（WEB, IMAGE, VIDEO, NEWS, MOBILE, etc.）
    warnings?: number;         // 警告数
    errors?: number;           // エラー数
    contents: Array<{          // サイトマップの内容
      type: string;            // コンテンツタイプ
      submitted: string;       // 送信されたURL数
      indexed: string;         // インデックスされたURL数
    }>
  }>
}
```

**使用例**:

```
example.comのサイトマップの状態を確認して

example.comのサイトマップでエラーが出ていないか教えて
```

**実装パス**: `src/tools/get-sitemaps.ts`

---

### 4. inspect_url

特定のURLのインデックス状態を詳細に検査します。

**Tool Name**: `inspect_url`

**Input Parameters**:

```typescript
{
  siteUrl: string;        // 必須: サイトURL（例: "https://example.com/"）
  inspectionUrl: string;  // 必須: 検査するURL（完全なURL）
}
```

**Output**:

```typescript
{
  inspectionResult: {
    indexStatusResult: {
      verdict: string;           // 判定結果（PASS, FAIL, NEUTRAL）
      coverageState: string;     // カバレッジ状態
      robotsTxtState: string;    // robots.txtの状態（ALLOWED, BLOCKED）
      indexingState: string;     // インデックス状態
      lastCrawlTime: string;     // 最終クロール日時（ISO 8601形式）
      pageFetchState: string;    // ページ取得状態（SUCCESSFUL, etc.）
      googleCanonical: string;   // Googleが認識した正規URL
      userCanonical: string;     // ユーザーが宣言した正規URL
      crawledAs: string;         // クロール時のユーザーエージェント（DESKTOP, MOBILE）
      verdict: string;           // 総合判定
    },
    mobileUsabilityResult?: {
      verdict: string;           // モバイルユーザビリティ判定
      issues?: Array<{           // 問題リスト
        issueType: string;
        message: string;
      }>
    },
    richResultsResult?: {
      verdict: string;           // リッチリザルト判定
      detectedItems?: Array<{    // 検出されたリッチリザルト
        richResultType: string;
        items: any[];
      }>
    }
  }
}
```

**Verdict Values**:
- `PASS` - 問題なし
- `FAIL` - 問題あり
- `NEUTRAL` - 判定不能

**Coverage States**:
- `Submitted and indexed` - 送信済みでインデックス登録済み
- `Crawled - currently not indexed` - クロール済みだがインデックス未登録
- `Discovered - currently not indexed` - 検出されたがインデックス未登録
- `Page with redirect` - リダイレクトページ
- `Excluded by 'noindex' tag` - noindexタグで除外

**使用例**:

```
https://example.com/new-page がインデックスされているか確認して

example.com/blog/article-123 のモバイルユーザビリティに問題がないか教えて

example.com/product/abc のリッチリザルトが検出されているか確認して
```

**実装パス**: `src/tools/inspect-url.ts`

---

### 5. submit_url_for_indexing

Google Indexing APIを使用してURLのインデックス登録または削除をリクエストします。

**Tool Name**: `submit_url_for_indexing`

**Input Parameters**:

```typescript
{
  url: string;                    // 必須: 送信するURL（完全なURL）
  type?: 'URL_UPDATED' | 'URL_DELETED';  // オプション: 通知タイプ
}
```

**Type Options**:
- `URL_UPDATED` - インデックス登録をリクエスト（デフォルト）
- `URL_DELETED` - インデックスからの削除をリクエスト

**Output**:

```typescript
{
  success: boolean;      // 送信が成功したか
  url: string;          // 送信したURL
  type: string;         // 通知タイプ
  notifyTime: string;   // 通知時刻（ISO 8601形式）
  message: string;      // 成功メッセージ
}
```

**使用例**:

```
# インデックス登録リクエスト
https://example.com/new-article をインデックスに送信して

# 削除リクエスト
https://example.com/old-page をインデックスから削除申請して
```

**エラー処理**:

このツールは以下のエラーを詳細に処理します：

- **403 Forbidden**: Indexing APIが有効化されていない、または権限不足
  - Indexing APIをGoogle Cloud Consoleで有効化
  - OAuth認証情報に`https://www.googleapis.com/auth/indexing`スコープを追加
  - Search ConsoleでURLの所有権を確認

**制限事項**:

- Indexing APIは主にJobPosting、BroadcastEventの構造化データを含むページ向け
- 一般的なWebページのインデックス依頼には通常のSearch Console UIを推奨
- レート制限: 1日あたり200リクエスト（プロジェクトごと）

**必要な設定**:

1. Google Cloud ConsoleでIndexing APIを有効化
2. OAuth 2.0認証に`https://www.googleapis.com/auth/indexing`スコープを追加
3. Search ConsoleでURLドメインの所有権確認

**実装パス**: `src/tools/submit-url.ts`

---

### 6. compare_periods

2つの期間の検索パフォーマンス指標を比較します。期間ごとの変化率と差分を計算します。

**Tool Name**: `compare_periods`

**Input Parameters**:

```typescript
{
  siteUrl: string;           // 必須: サイトURL
  currentStartDate: string;  // 必須: 現在期間の開始日（YYYY-MM-DD）
  currentEndDate: string;    // 必須: 現在期間の終了日（YYYY-MM-DD）
  previousStartDate: string; // 必須: 前期間の開始日（YYYY-MM-DD）
  previousEndDate: string;   // 必須: 前期間の終了日（YYYY-MM-DD）
  dimensions?: string[];     // オプション: ディメンション配列
  rowLimit?: number;         // オプション: 取得行数（デフォルト: 100, 最大: 25000）
}
```

**Output**:

```typescript
{
  periods: {
    current: { startDate: string, endDate: string },
    previous: { startDate: string, endDate: string }
  },
  totals: {
    clicks: MetricComparison,
    impressions: MetricComparison,
    ctr: MetricComparison,
    position: MetricComparison
  },
  rows: Array<{
    keys?: string[];      // ディメンションの値
    clicks: MetricComparison,
    impressions: MetricComparison,
    ctr: MetricComparison,
    position: MetricComparison
  }>,
  dimensions: string[],
  totalRows: number
}

// MetricComparisonの構造
interface MetricComparison {
  current: number;       // 現在期間の値
  previous: number;      // 前期間の値
  change: number;        // 差分（current - previous）
  changePercent: number; // 変化率（%）小数点2桁まで
}
```

**使用例**:

```
# 今週と先週の比較
example.comの今週（10/1-10/7）と先週（9/24-9/30）のパフォーマンスを比較して

# 月次比較（クエリ別）
example.comの2025年1月と12月のクエリ別パフォーマンスを比較して
（dimensions: ["query"]）

# 複数ディメンションでの比較
example.comの先月と先々月のページ別・デバイス別パフォーマンスを比較
（dimensions: ["page", "device"]）
```

**計算ロジック**:

- **change**: `current - previous`
- **changePercent**: `(change / previous) * 100`
  - previousが0の場合は0%
  - 小数点2桁で四捨五入

**totalsの計算**:

- **clicks, impressions**: 各期間の合計値を比較
- **ctr, position**: 各期間の平均値を比較

**比較のベストプラクティス**:

1. **同じ期間長で比較**: 7日間vs7日間、30日間vs30日間など
2. **曜日を揃える**: 月曜〜日曜 vs 月曜〜日曜
3. **季節性を考慮**: 前年同月との比較も有効
4. **ディメンション指定**: クエリ、ページ、デバイス別など詳細分析に活用

**実装パス**: `src/tools/compare-periods.ts`

---

## Google Search Console API制限

### レート制限

- **1日あたり**: 2,000リクエスト（プロジェクトごと）
- **100秒あたり**: 600リクエスト

### データ制限

- **get_analytics**:
  - 最大16ヶ月前までのデータ
  - 最大25,000行
  - データは通常2〜3日遅れ

### 必要なスコープ

- `https://www.googleapis.com/auth/webmasters.readonly` - 読み取り専用（推奨）
- `https://www.googleapis.com/auth/webmasters` - 読み書き
- `https://www.googleapis.com/auth/indexing` - Indexing API（submit_url_for_indexing用）

### Indexing API制限

- **1日あたり**: 200リクエスト（submit_url_for_indexing用）

---

## 開発者向け情報

### 新しいツールの追加手順

1. `src/tools/`に新しいファイルを作成
2. ツール名、説明、入力スキーマ、ハンドラー関数を実装
3. `src/index.ts`でツールを登録

### googleapis使用例

```typescript
import { google } from 'googleapis';

const searchconsole = google.searchconsole('v1');

// サイト一覧取得
const sites = await searchconsole.sites.list({
  auth: authClient
});

// 検索分析データ取得
const analytics = await searchconsole.searchanalytics.query({
  siteUrl: 'https://example.com/',
  requestBody: {
    startDate: '2025-09-01',
    endDate: '2025-09-30',
    dimensions: ['query'],
    rowLimit: 100
  },
  auth: authClient
});
```

### 参考リンク

- [Google Search Console API v1](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index)
