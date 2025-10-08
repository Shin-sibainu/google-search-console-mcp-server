# Google Search Console MCP Server

A Model Context Protocol (MCP) server that provides programmatic access to Google Search Console API data through Claude Code and Cursor.

## Quick Start

**New to this MCP server?** Jump to [Step-by-Step Setup Guide](#step-by-step-setup-guide) for complete instructions.

## Features

- 🔍 **List Sites** - Get all Search Console properties you have access to
- 📊 **Search Analytics** - Query search performance data with flexible filtering
- 🗺️ **Sitemap Information** - Retrieve sitemap status and indexing statistics
- 🔎 **URL Inspection** - Check detailed indexing status of specific URLs
- 📤 **Submit URL for Indexing** - Request Google to index or remove URLs
- 📈 **Compare Periods** - Compare search performance between two time periods
- 🛡️ **Robust Error Handling** - Detailed error messages with actionable guidance
- 🔄 **Automatic Retry Logic** - Handles rate limits and transient failures
- ✅ **Input Validation** - Validates all parameters before API calls

## Setup

### Google Cloud Console Setup

### 1. Create a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable APIs

1. Navigate to **APIs & Services** → **Library**
2. Search for and enable the following APIs:
   - **Google Search Console API** (required)
   - **Indexing API** (required for submit_url_for_indexing tool)

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Application type**: Desktop app
4. Name it (e.g., "Google Search Console MCP")
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 4. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Add your email address to **Test users** section

### 5. Add Redirect URI

1. Go back to **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8080
   ```
4. Click **Save**

## Usage

Once configured, you can use the tools in Claude Desktop or Claude Code:

```
Search Consoleのサイト一覧を取得して
```

## Usage with Claude Desktop

### Quick Start (Recommended)

Edit your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["google-search-console-mcp-server"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

### Alternative: Local Installation

If you prefer to install locally:

```bash
npm install -g google-search-console-mcp-server
```

Then use in config:

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "google-search-console-mcp",
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

**Note**: Restart Claude Desktop after editing the config file.

## Available Tools

### 1. `list_sites`

Get all Search Console sites you have access to.

**Parameters**: None

**Example**:

```
Search Consoleのサイト一覧を教えて
```

### 2. `get_analytics`

Query search performance data for a specified date range.

**Parameters**:

- `siteUrl` (required): Site URL (e.g., "https://example.com/")
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `dimensions` (optional): Array of dimensions ["query", "page", "country", "device", "searchAppearance"]
- `rowLimit` (optional): Max rows (default: 100, max: 25000)
- `startRow` (optional): Starting row for pagination

**Example**:

```
example.comの過去7日間のトップクエリを取得して

example.comの2025年1月1日から1月31日までの、
ページ別とデバイス別のパフォーマンスを500件取得して
```

### 3. `get_sitemaps`

Retrieve sitemap information for a site.

**Parameters**:

- `siteUrl` (required): Site URL

**Example**:

```
example.comのサイトマップ情報を確認して
```

### 4. `inspect_url`

Inspect the indexing status of a specific URL.

**Parameters**:

- `siteUrl` (required): Site URL (e.g., "https://example.com/")
- `inspectionUrl` (required): Full URL to inspect

**Example**:

```
https://example.com/blog/article のインデックス状態を検査して
```

### 5. `submit_url_for_indexing`

Submit a URL to Google for indexing or request URL removal using the Indexing API.

**Parameters**:

- `url` (required): Full URL to submit (e.g., "https://example.com/page")
- `type` (optional): Notification type - "URL_UPDATED" (default) or "URL_DELETED"

**Example**:

```
https://example.com/new-article をインデックスに送信して

https://example.com/old-page を削除申請して（type: URL_DELETED）
```

**Note**: Requires Indexing API to be enabled in Google Cloud Console and the `https://www.googleapis.com/auth/indexing` scope.

### 6. `compare_periods`

Compare search performance metrics between two time periods (e.g., this week vs last week).

**Parameters**:

- `siteUrl` (required): Site URL (e.g., "https://example.com/")
- `currentStartDate` (required): Current period start date (YYYY-MM-DD)
- `currentEndDate` (required): Current period end date (YYYY-MM-DD)
- `previousStartDate` (required): Previous period start date (YYYY-MM-DD)
- `previousEndDate` (required): Previous period end date (YYYY-MM-DD)
- `dimensions` (optional): Array of dimensions to group by
- `rowLimit` (optional): Max rows (default: 100, max: 25000)

**Example**:

```
example.comの今週と先週のパフォーマンスを比較して

example.comの2025年1月と12月のクエリ別パフォーマンスを比較して
（currentStartDate: 2025-01-01, currentEndDate: 2025-01-31,
  previousStartDate: 2024-12-01, previousEndDate: 2024-12-31,
  dimensions: ["query"]）
```

## API Limits

- **Daily quota**: 2,000 requests per project
- **Per 100 seconds**: 600 requests
- **Data availability**: Up to 16 months of historical data
- **Data latency**: Typically 2-3 days

## Error Handling & Retry Logic

This MCP server includes comprehensive error handling:

### Automatic Retries

- **Rate Limiting (429)**: Automatically retries with exponential backoff
- **Server Errors (5xx)**: Retries up to 3 times with increasing delays
- **Transient Failures**: Smart retry logic with jitter to prevent thundering herd

### Input Validation

All tools validate inputs before making API calls:

- **Site URL**: Validates URL format and structure
- **Dates**: Validates YYYY-MM-DD format and logical date ranges
- **Row Limits**: Ensures limits are within API constraints (1-25,000)

### Detailed Error Messages

Error messages include:

- Clear description of what went wrong
- HTTP status code
- Actionable steps to resolve the issue

Example:

```
Access denied for list sites (403)
Verify your authentication credentials and ensure you have access to this Search Console property.
You may need to add your account as a test user in Google Cloud Console.
```

## Troubleshooting

### "Missing required environment variables"

Make sure your `.env` file exists and contains valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### "redirect_uri_mismatch"

Ensure `http://localhost:8080` is added to **Authorized redirect URIs** in Google Cloud Console.

### "Error 403: access_denied"

Add your Google account email to the **Test users** section in OAuth consent screen.

### "Invalid site URL format"

Site URLs must be complete URLs like:

- `https://example.com/` (for URL-prefix properties)
- `sc-domain:example.com` (for domain properties)

### "Date range too old"

Search Console data is only available for the last 16 months.

### "Rate limit exceeded"

The tool will automatically retry with backoff. If you continue to hit limits:

- Wait a few minutes between requests
- Reduce `rowLimit` in analytics queries
- API Limits: 2,000 requests/day, 600 requests/100 seconds

### Token Expired

Re-run the authentication setup:

```bash
node build/auth/setup-auth.js
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Re-authenticate

```bash
node build/auth/setup-auth.js
```

## Project Structure

```
src/
├── index.ts                 # MCP server entry point
├── auth/
│   ├── google-auth.ts       # OAuth 2.0 client
│   └── setup-auth.ts        # Authentication CLI
├── tools/
│   ├── list-sites.ts        # List sites tool
│   ├── get-analytics.ts     # Search analytics tool
│   ├── get-sitemaps.ts      # Sitemap info tool
│   ├── inspect-url.ts       # URL inspection tool
│   ├── submit-url.ts        # Submit URL for indexing
│   └── compare-periods.ts   # Compare time periods
├── types/
│   └── index.ts             # Type definitions
└── utils/
    └── error-handler.ts     # Error handling & validation
```

## Security Notes

- Never commit `.env` or `.mcp.json` files to version control
- Keep your refresh token secure
- Use readonly scope (`webmasters.readonly`) when possible
- Refresh tokens provide persistent access - store them securely

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Setup

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Google Search Console API** (and optionally **Indexing API**)
3. Create **OAuth 2.0 Client ID** (Desktop app)
4. Add `http://localhost:8080` to **Authorized redirect URIs**
5. Add your email to **Test users** in OAuth consent screen

### 2. Get Refresh Token

Run this command with your credentials:

```bash
# Set your credentials
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-secret"
export GOOGLE_REDIRECT_URI="http://localhost:8080"

# Get refresh token
npx -y google-search-console-mcp-setup
```

Copy the `GOOGLE_REFRESH_TOKEN` from the output.

### 3. Configure MCP

Add to your MCP config file:

**Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Claude Code**: `.mcp.json` in your project root

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["google-search-console-mcp-server"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:8080",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

Restart Claude Desktop or reload Claude Code window.

---

## Resources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
