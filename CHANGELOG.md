# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-10-08

### Added

- **Simplified authentication setup**
  - Added `google-search-console-mcp-setup` bin command
  - Users can now run `npx -y google-search-console-mcp-setup` without global installation
  - No need to clone repository or install locally for initial auth setup

### Changed

- Updated README.md with simplified authentication instructions
- Build script now makes setup-auth.js executable

## [0.3.0] - 2025-10-08

### Added

- **submit_url_for_indexing tool**
  - Submit URLs to Google Indexing API for crawling or removal
  - Supports URL_UPDATED (request indexing) and URL_DELETED (request removal)
  - Detailed error handling for Indexing API specific errors (403 permissions)
  - URL format validation
  - Added `https://www.googleapis.com/auth/indexing` scope to OAuth configuration
- **compare_periods tool**
  - Compare search performance metrics between two time periods
  - Calculates change and change percentage for all metrics
  - Parallel data fetching for both periods using Promise.all
  - Returns both totals comparison and row-by-row comparisons
  - Supports all dimensions (query, page, country, device, searchAppearance)
  - Configurable row limits (up to 25,000)
- **Enhanced documentation**
  - Added detailed API specifications for new tools in docs/API.md
  - Updated README.md with usage examples for new tools
  - Added Indexing API setup instructions
  - Updated project structure documentation

### Technical Improvements

- Created `src/tools/submit-url.ts` with Indexing API integration
- Created `src/tools/compare-periods.ts` with period comparison logic
- Updated `src/auth/google-auth.ts` to include Indexing API scope
- Enhanced Google Cloud Console setup guide for Indexing API

### Notes

- Indexing API has a separate rate limit: 200 requests per day
- Indexing API is primarily intended for pages with JobPosting or BroadcastEvent structured data
- For general web page indexing, use the Search Console UI

## [0.2.0] - 2025-10-08

### Added

- **Robust error handling system**
  - Custom `SearchConsoleError` class with detailed messages
  - HTTP status code-specific error handling (400, 401, 403, 404, 429, 5xx)
  - Actionable guidance in error messages
- **Automatic retry logic with exponential backoff**
  - Retries up to 3 times for rate limits and server errors
  - Exponential backoff with jitter to prevent thundering herd
  - Smart retry logic (skips retrying on 4xx client errors except 429)
- **Comprehensive input validation**
  - Site URL format validation
  - Date format validation (YYYY-MM-DD)
  - Date range validation (16-month limit, start ≤ end)
  - Row limit validation (1-25,000)
  - Inspection URL validation
- **Enhanced tool responses**
  - Metadata in analytics responses (totalRows, dateRange, dimensions)
  - Helpful messages when no results found
  - Count of results in list responses
- **Improved documentation**
  - Error Handling & Retry Logic section in README
  - Expanded Troubleshooting guide
  - JSDoc comments on all functions

### Technical Improvements

- Created `src/utils/error-handler.ts` utility module
- Added validation functions for all input types
- Integrated retry logic into all API calls
- Enhanced error context for better debugging

## [0.1.0] - 2025-10-08

### Added

- Initial release of Google Search Console MCP Server
- OAuth 2.0 authentication with Google
- Four core MCP tools:
  - `list_sites` - List all accessible Search Console properties
  - `get_analytics` - Query search performance data with flexible filtering
  - `get_sitemaps` - Retrieve sitemap information and status
  - `inspect_url` - Inspect detailed indexing status of URLs
- Authentication setup CLI (`setup-auth.js`)
- Support for localhost redirect URI (`http://localhost:8080`)
- Comprehensive documentation (README.md, API.md, DEVELOPMENT.md)
- TypeScript support with full type definitions
- ESM module support

### Technical Details

- Node.js v18+ required
- Built with `@modelcontextprotocol/sdk` v0.5.0
- Uses `googleapis` v144.0.0 for Google API integration
- TypeScript compilation target: ES2022
- Module system: Node16 with ESM

[0.3.0]: https://github.com/Shin-sibainu/google-search-console-mcp-server/releases/tag/v0.3.0
[0.2.0]: https://github.com/Shin-sibainu/google-search-console-mcp-server/releases/tag/v0.2.0
[0.1.0]: https://github.com/Shin-sibainu/google-search-console-mcp-server/releases/tag/v0.1.0
