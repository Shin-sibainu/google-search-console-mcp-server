# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Structure

**IMPORTANT**: Always refer to these documentation files for context and guidance:

- **docs/PROJECT_STATUS.md** - Current implementation status, completed/pending features, next steps
- **docs/TASKS.md** - Detailed task checklist for all implementation phases (use this for tracking progress)
- **docs/DEVELOPMENT.md** - Development setup, coding standards, testing procedures, troubleshooting
- **docs/API.md** - Complete API reference for all MCP tools with examples
- **docs/requirement.md** - Original requirements specification (Japanese)

Before starting any work, check `docs/PROJECT_STATUS.md` and `docs/TASKS.md` to understand current progress.

## Project Overview

Google Search Console MCP Server - A Model Context Protocol server that provides programmatic access to Google Search Console API data through Claude Code and Cursor.

**Language**: TypeScript
**Runtime**: Node.js v18+
**Package Type**: ESM (type: "module")

## Build & Development Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Initial authentication setup
npm run setup-auth

# Prepare for publishing (runs build)
npm run prepare
```

## Project Architecture

### Directory Structure

```
src/
├── index.ts                 # Main MCP server entry point
├── auth/
│   ├── google-auth.ts       # Google OAuth 2.0 authentication client
│   └── setup-auth.ts        # CLI tool for initial authentication
├── tools/
│   ├── list-sites.ts        # MCP tool: List accessible Search Console sites
│   ├── get-analytics.ts     # MCP tool: Query search performance data
│   ├── get-sitemaps.ts      # MCP tool: Retrieve sitemap information
│   └── inspect-url.ts       # MCP tool: Inspect URL indexing status
└── types/
    └── index.ts             # TypeScript type definitions
build/                       # Compiled output (gitignored)
```

### Authentication Flow

1. Uses Google OAuth 2.0 with refresh tokens
2. Required environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
3. Scopes: `https://www.googleapis.com/auth/webmasters.readonly` or `https://www.googleapis.com/auth/webmasters`
4. Initial setup via `setup-auth.ts` generates refresh token from authorization code

### MCP Tools Implementation

Each tool in `src/tools/` exports:

- Tool name and description
- Input schema (using JSON Schema)
- Handler function that calls Google Search Console API

**Four Core Tools**:

1. **list_sites**: Returns all sites user has access to (no parameters)
2. **get_analytics**: Query search performance data
   - Required: `siteUrl`, `startDate`, `endDate`
   - Optional: `dimensions[]`, `rowLimit`, `startRow`
   - Returns clicks, impressions, CTR, position
3. **get_sitemaps**: Retrieve sitemap status for a site
   - Required: `siteUrl`
   - Returns submission status, errors, indexing stats
4. **inspect_url**: Check indexing status of specific URL
   - Required: `siteUrl`, `inspectionUrl`
   - Returns coverage state, crawl status, mobile usability, rich results

### Main Server (index.ts)

- Initializes MCP server using `@modelcontextprotocol/sdk`
- Registers all tools from `src/tools/`
- Sets up Google auth client
- Handles stdio transport for communication with Claude/Cursor

## Key Technical Constraints

- **Module System**: Must use ESM (`import`/`export`, not `require`)
- **TypeScript Config**: Target ES2022, moduleResolution Node16
- **Build Output**: Compiled to `./build/` directory
- **Binary Entry**: `build/index.js` must have executable shebang (`#!/usr/bin/env node`)
- **Build Script**: Must include `chmod +x ./build/index.js` after tsc

## Distribution

Intended to be published to npm and run via:

```bash
npx @your-username/google-search-console-mcp-server
```

MCP client configuration (Claude Desktop/Cursor):

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["@your-username/google-search-console-mcp-server"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

## Dependencies

**Runtime**:

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `googleapis` - Google API client
- `dotenv` - Environment variable loading

**Dev**:

- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

## Security Notes

- Never commit `.env` files or tokens to git
- Use readonly scope (`webmasters.readonly`) when possible
- Refresh tokens provide persistent access - store securely
- Error messages must not expose credentials

## Implementation Status (per docs/requirement.md)

**Phase 1 (MVP)**: Completed checkmarks for project setup, auth, MCP server base, list_sites, get_analytics
**Phase 2**: Completed checkmarks for get_sitemaps, inspect_url
**Phase 3**: Error handling, rate limiting, tests, docs - not yet implemented

- タスクが終わったらチェックを入れるようにしてください。
