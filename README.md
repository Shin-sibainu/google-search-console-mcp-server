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

## Prerequisites

Before using this MCP server, you need:

### 1. Google Search Console

- Site registered in Search Console
- Site ownership verified
- Access to the Search Console property you want to query

### 2. Google Cloud Platform (GCP)

- A GCP project (free tier is sufficient)
- **Google Search Console API** enabled
- **OAuth 2.0 Client ID** credentials (Desktop app type)
- (Optional) **Indexing API** enabled if you want to use `submit_url_for_indexing`

💡 **Note**: You only need to set up GCP once. The `CLIENT_ID` and `CLIENT_SECRET` are reusable across multiple sites in your Search Console.

## Setup

### 1. Configure Claude Code

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "-p", "google-search-console-mcp-server", "google-search-console-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

⚠️ **Important**: The `args` must include all three parts:
1. `"-y"` - Auto-confirm npx prompt
2. `"-p", "google-search-console-mcp-server"` - Package name
3. `"google-search-console-mcp"` - Executable name (different from package name!)

💡 **Note**: `GOOGLE_REDIRECT_URI` defaults to `http://localhost:8080` and doesn't need to be specified unless you want to use a different port.

### 2. Get Google OAuth Credentials

⚠️ **Important**: If you're already using OAuth 2.0 for other services (Supabase, Firebase, etc.), **create a new OAuth 2.0 Client ID specifically for this MCP server**. Don't reuse existing credentials.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Create or select a project**
3. **Enable APIs**:
   - Navigate to "APIs & Services" → "Enable APIs and Services"
   - Search and enable **"Google Search Console API"**
   - (Optional) Enable **"Indexing API"** if you want to use `submit_url_for_indexing`
4. **Create OAuth 2.0 Client ID**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Desktop app**
   - Name: `MCP Server` (or any name you prefer)
5. **Configure Authorized redirect URIs**:
   - Click on the created OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", click "Add URI"
   - Add: `http://localhost:8080` (no trailing slash!)
   - Click "Save"
6. **Add test users** (if OAuth consent screen is in Testing mode):
   - Go to "OAuth consent screen"
   - Scroll to "Test users" section
   - Add your Google account email
   - Click "Save"

💾 **Save your credentials**: Copy the `CLIENT_ID` and `CLIENT_SECRET` displayed after creation. You'll need them in the next step.

### 3. Get Refresh Token

Run the interactive setup command:

```bash
npx -y -p google-search-console-mcp-server google-search-console-mcp-setup
```

You'll be prompted to enter:
- `GOOGLE_CLIENT_ID` (from step 2)
- `GOOGLE_CLIENT_SECRET` (from step 2)
- `GOOGLE_REDIRECT_URI` (press Enter for default: `http://localhost:8080`)

A browser window will open for authentication. After authorizing, the command will output the complete `.mcp.json` configuration with all three credentials including the `GOOGLE_REFRESH_TOKEN`.

Copy the configuration and paste it into your `.mcp.json`, then reload Claude Code window.

## Usage

Once configured, you can use the tools in Claude Desktop or Claude Code:

```
Show me my Google Search Console sites
```

or

```
Get search performance data for example.com for the last 7 days
```

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
Compare this week vs last week performance for example.com

Compare query performance for example.com between January 2025 and December 2024
(currentStartDate: 2025-01-01, currentEndDate: 2025-01-31,
 previousStartDate: 2024-12-01, previousEndDate: 2024-12-31,
 dimensions: ["query"])
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

### Setup Issues

#### "invalid_client" Error During Authentication

**Problem**: When running the setup command, you get `Error during authentication: invalid_client`.

**Causes & Solutions**:

1. **CLIENT_ID and CLIENT_SECRET mismatch**
   - Verify they're from the same OAuth 2.0 Client in GCP Console
   - Copy them again directly from Google Cloud Console

2. **Reusing credentials from other services** (Supabase, Firebase, etc.)
   - **Solution**: Create a new OAuth 2.0 Client ID specifically for this MCP server
   - The redirect URIs for other services (e.g., `https://xxx.supabase.co/auth/v1/callback`) won't work with `http://localhost:8080`

3. **CLIENT_SECRET was regenerated**
   - If you reset the secret in GCP Console, use the new one
   - Old secrets become invalid immediately

#### "could not determine executable to run" Error

**Problem**: `npx google-search-console-mcp-server` fails with "could not determine executable to run".

**Solution**: The package name and executable name are different. Use the correct `.mcp.json` configuration:

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "-p", "google-search-console-mcp-server", "google-search-console-mcp"],
      "env": { ... }
    }
  }
}
```

#### MCP Server Shows "✘ failed" in Claude Code

**Debugging steps**:

1. **Check the error details**:
   - In Claude Code's MCP status screen, press Enter on the failed server
   - Scroll down to see the stderr (error output)

2. **Test manually**:
   ```bash
   cd your-project-directory
   export GOOGLE_CLIENT_ID="your-id"
   export GOOGLE_CLIENT_SECRET="your-secret"
   export GOOGLE_REFRESH_TOKEN="your-token"
   npx -y google-search-console-mcp-server
   ```

3. **Common causes**:
   - **Search Console API not enabled**: Enable it in GCP Console
   - **Wrong credentials**: Verify CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN
   - **Expired token**: Run the setup command again to get a new REFRESH_TOKEN
   - **npx cache issue**: Clear npx cache: `rm -rf ~/.npm/_npx`

4. **Reload Claude Code**: After fixing `.mcp.json`, reload the window (Ctrl/Cmd + Shift + P → "Developer: Reload Window")

### Runtime Errors

#### "Missing required environment variables"

Make sure your `.mcp.json` file has all three environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`.

#### "redirect_uri_mismatch"

Ensure `http://localhost:8080` (no trailing slash!) is added to **Authorized redirect URIs** in the OAuth 2.0 Client settings in Google Cloud Console.

#### "Error 403: access_denied"

1. **OAuth consent screen is in Testing mode**: Add your Google account email to the **Test users** section
2. **API not enabled**: Enable "Google Search Console API" in GCP Console
3. **No access to the site**: Verify you have access to the Search Console property you're querying

#### "Invalid site URL format"

Site URLs must be complete URLs like:

- `https://example.com/` (for URL-prefix properties)
- `sc-domain:example.com` (for domain properties)

#### "Date range too old"

Search Console data is only available for the last 16 months.

#### "Rate limit exceeded"

The tool will automatically retry with backoff. If you continue to hit limits:

- Wait a few minutes between requests
- Reduce `rowLimit` in analytics queries
- API Limits: 2,000 requests/day, 600 requests/100 seconds

#### Token Expired

If you see authentication errors, your refresh token may have expired. Re-run the authentication setup:

```bash
npx -y -p google-search-console-mcp-server google-search-console-mcp-setup
```

Copy the new `GOOGLE_REFRESH_TOKEN` to your `.mcp.json`.

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

---

## Resources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
