# 実装タスク管理

このファイルは、Google Search Console MCP Serverの実装タスクを管理するためのドキュメントです。

**最終更新**: 2025-10-08

---

## 現在のフェーズ

🚀 **Phase 5完了 - Enhanced Production Ready (v0.3.0)！**

---

## Phase 0: プロジェクトセットアップ ✅

### 設定ファイル作成

- [x] `package.json` 作成
  - 依存関係: `@modelcontextprotocol/sdk`, `googleapis`, `dotenv`
  - devDependencies: `typescript`, `@types/node`
  - scripts: `build`, `dev`, `setup-auth`
  - bin設定
  - files設定

- [x] `tsconfig.json` 作成
  - target: ES2022
  - module: Node16
  - moduleResolution: Node16
  - outDir: ./build
  - strict mode有効

- [x] `.gitignore` 作成
  - `node_modules/`
  - `build/`
  - `.env`
  - `*.log`

- [x] `.env.example` 作成
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `GOOGLE_REFRESH_TOKEN`

- [x] `src/` ディレクトリ構造作成
  ```
  src/
  ├── index.ts
  ├── auth/
  ├── tools/
  └── types/
  ```

---

## Phase 1: MVP実装 ✅

### 1.1 型定義

- [x] `src/types/index.ts` 作成
  - Google Search Console APIのレスポンス型
  - MCP Tool用の型定義
  - 共通インターフェース

### 1.2 認証システム

- [x] `src/auth/google-auth.ts` 実装
  - OAuth 2.0クライアント作成
  - リフレッシュトークンからアクセストークン取得
  - 認証クライアントのエクスポート

- [x] `src/auth/setup-auth.ts` 実装
  - 認証URL生成
  - 認証コード入力受付
  - リフレッシュトークン生成・表示
  - CLI実行可能にする

### 1.3 MCPサーバー基盤

- [x] `src/index.ts` 基本実装
  - MCPサーバー初期化
  - stdio transport設定
  - ツール登録機構
  - エラーハンドリング
  - shebang追加 (`#!/usr/bin/env node`)

### 1.4 基本ツール実装

- [x] `src/tools/list-sites.ts` 実装
  - ツール名・説明定義
  - 入力スキーマ（パラメータなし）
  - `searchconsole.sites.list()` 呼び出し
  - レスポンス整形

- [x] `src/tools/get-analytics.ts` 実装
  - ツール名・説明定義
  - 入力スキーマ（siteUrl, startDate, endDate, dimensions, rowLimit, startRow）
  - `searchconsole.searchanalytics.query()` 呼び出し
  - レスポンス整形

- [x] `src/index.ts`でツール登録
  - list_sites登録
  - get_analytics登録

### 1.5 ビルドと動作確認

- [x] ビルドスクリプト実行
  - `npm run build`
  - `build/index.js`に実行権限付与確認

- [ ] ローカル動作確認（認証情報が必要）
  - `node build/index.js`でサーバー起動
  - MCPクライアントから接続テスト
  - list_sitesツール動作確認
  - get_analyticsツール動作確認

---

## Phase 2: 追加ツール実装 ✅

### 2.1 サイトマップツール

- [x] `src/tools/get-sitemaps.ts` 実装
  - ツール名・説明定義
  - 入力スキーマ（siteUrl）
  - `searchconsole.sitemaps.list()` 呼び出し
  - レスポンス整形

- [x] `src/index.ts`でツール登録

- [x] 動作確認

### 2.2 URL検査ツール

- [x] `src/tools/inspect-url.ts` 実装
  - ツール名・説明定義
  - 入力スキーマ（siteUrl, inspectionUrl）
  - `searchconsole.urlInspection.index.inspect()` 呼び出し
  - レスポンス整形

- [x] `src/index.ts`でツール登録

- [x] 動作確認

---

## Phase 3: ドキュメント整備 ✅

### 3.1 ドキュメント作成

- [x] `README.md` 作成
  - プロジェクト概要
  - インストール方法
  - Google Cloud Console設定手順
  - 初回認証手順
  - Claude Desktop/Cursor設定例
  - 全4ツールの使用例
  - API制限情報
  - トラブルシューティング

- [x] `LICENSE` 作成
  - MIT License

- [x] `CHANGELOG.md` 作成
  - v0.1.0 初回リリース

- [x] `.mcp.json.example` 作成
  - Claude Code用設定例

---

---

## Phase 4: 改善・最適化 ✅

### 4.1 エラーハンドリング強化

- [x] `src/utils/error-handler.ts` 作成
- [x] カスタムエラークラス（SearchConsoleError）
- [x] 認証エラーの詳細メッセージ
- [x] APIエラーのハンドリング
  - 400 Bad Request（無効なリクエスト）
  - 401/403 Forbidden（権限不足）
  - 404 Not Found（サイトが見つからない）
  - 429 Too Many Requests（レート制限）
  - 500/502/503 Server Errors（サーバーエラー）
- [x] ネットワークエラーのハンドリング
- [x] バリデーションエラーの適切な返却

### 4.2 レート制限対応

- [x] リトライロジック実装（`retryWithBackoff`関数）
- [x] 指数バックオフ（1秒→2秒→4秒）
- [x] ジッター追加（0-1秒ランダム遅延）
- [x] 最大3回リトライ
- [x] 4xxエラー（429以外）は即座に失敗
- [x] 全ツールにリトライ適用

### 4.3 入力バリデーション

- [x] `validateSiteUrl` - サイトURL検証
- [x] `validateDate` - 日付形式検証（YYYY-MM-DD）
- [x] `validateDateRange` - 日付範囲検証
  - 開始日 ≦ 終了日
  - 16ヶ月以内のデータ
- [x] rowLimit検証（1-25,000）
- [x] inspectionUrl検証

### 4.4 コード品質向上

- [x] JSDocコメント追加
  - 全ツールのハンドラー関数
  - エラーハンドリング関数
  - バリデーション関数
- [x] README更新
  - エラーハンドリングセクション追加
  - トラブルシューティング拡充
  - 新機能の説明追加

---

## Phase 5: 公開前の機能追加 ✅

### 5.1 追加ツール実装

- [x] `src/tools/submit-url.ts` 実装
  - ツール名: `submit_url_for_indexing`
  - Google Indexing API v3統合
  - URL_UPDATED（インデックス登録）
  - URL_DELETED（削除リクエスト）
  - URL形式バリデーション
  - 403エラーの詳細ハンドリング

- [x] `src/tools/compare-periods.ts` 実装
  - ツール名: `compare_periods`
  - 2期間のパフォーマンス比較
  - Promise.allで並列データ取得
  - MetricComparison型定義（current, previous, change, changePercent）
  - 総計比較と行別比較
  - 全ディメンション対応

- [x] `src/auth/google-auth.ts` 更新
  - `https://www.googleapis.com/auth/indexing` スコープ追加

- [x] `src/index.ts` 更新
  - 2つの新ツール登録
  - ビルド確認完了

### 5.2 ドキュメント更新

- [x] `README.md` 更新
  - Features セクションに2ツール追加
  - Google Cloud設定にIndexing API追加手順
  - Available Tools セクションに詳細な使用例追加
  - プロジェクト構造図更新

- [x] `docs/API.md` 更新
  - submit_url_for_indexing 詳細仕様追加
  - compare_periods 詳細仕様追加
  - エラー処理説明
  - 制限事項・ベストプラクティス記載
  - Indexing API制限情報追加

- [x] `CHANGELOG.md` 更新
  - v0.3.0 エントリ作成
  - 新機能の詳細説明
  - 技術的改善点記載

- [x] `package.json` 更新
  - バージョン 0.2.0 → 0.3.0

- [x] `docs/PROJECT_STATUS.md` 更新
  - Phase 5完了マーク
  - 新ツール2つ追加

- [x] `docs/TASKS.md` 更新
  - Phase 5セクション追加

---

## Phase 6: 公開準備（オプション）

### 6.1 パッケージ準備

- [ ] `package.json`最終チェック
  - name, version, description
  - author, license
  - keywords
  - repository URL

- [ ] `.npmignore` 作成（または`package.json`の`files`設定）
  - ソースコード除外
  - ビルド成果物のみ含める

- [ ] ライセンスファイル作成
  - `LICENSE` (MIT)

### 6.2 動作確認

- [ ] ローカルで`npm pack`実行
- [ ] 生成されたtarballを別ディレクトリでインストール
- [ ] `npx`経由で動作確認
- [ ] Claude Desktop/Cursorでの統合テスト

### 6.3 NPM公開

- [ ] NPMアカウント準備
- [ ] `npm login`
- [ ] `npm publish`
- [ ] 公開後の動作確認

---

## 今後の拡張案（Phase 7以降）

### 追加ツール候補

- [x] ~~`submit_url` - URLのインデックス登録リクエスト~~ ✅ Phase 5で実装済み
- [ ] `get_search_appearance` - 検索での見え方データ取得
- [ ] `submit_sitemap` - サイトマップの送信
- [ ] `delete_sitemap` - サイトマップの削除

### 機能拡張

- [ ] データキャッシング機能
- [ ] バッチ処理対応
- [ ] プログレスバー表示
- [ ] CSV/JSONエクスポート機能
- [ ] レポート自動生成

### 分析機能

- [ ] トレンド分析機能
- [ ] 前週/前月比較
- [ ] アラート機能
- [ ] カスタムレポート

---

## メモ・課題

### 技術的な注意点

- ESM形式なので`__dirname`は使えない（`import.meta.url`を使用）
- `chmod +x`はLinux/Mac用、Windows環境では無視される
- googleapis v144以降を使用（最新の型定義）

### 確認事項

- Google Search Console APIのクォータ上限
- 複数サイトを並列処理する場合のレート制限
- 大量データ取得時のメモリ使用量

### 改善検討

- 設定ファイル（`.gsc-mcp-config.json`）のサポート
- 複数のGoogle アカウント切り替え機能
- インタラクティブCLIモード

---

## 完了の定義

各タスクは以下の条件を満たした時に完了とする:

1. コードが実装され、ビルドが通る
2. ローカルで動作確認済み
3. エラーハンドリングが実装されている
4. 必要に応じてコメント・ドキュメントが追加されている
