#!/usr/bin/env node

/**
 * Google Search Console MCP Server
 * Main entry point
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createAuthClient } from './auth/google-auth.js';
import * as listSites from './tools/list-sites.js';
import * as getAnalytics from './tools/get-analytics.js';
import * as getSitemaps from './tools/get-sitemaps.js';
import * as inspectUrl from './tools/inspect-url.js';
import * as submitUrl from './tools/submit-url.js';
import * as comparePeriods from './tools/compare-periods.js';

// Create OAuth2 client
const authClient = createAuthClient();

// Define available tools
const tools = [
  {
    name: listSites.name,
    description: listSites.description,
    inputSchema: listSites.inputSchema,
    handler: listSites.handler,
  },
  {
    name: getAnalytics.name,
    description: getAnalytics.description,
    inputSchema: getAnalytics.inputSchema,
    handler: getAnalytics.handler,
  },
  {
    name: getSitemaps.name,
    description: getSitemaps.description,
    inputSchema: getSitemaps.inputSchema,
    handler: getSitemaps.handler,
  },
  {
    name: inspectUrl.name,
    description: inspectUrl.description,
    inputSchema: inspectUrl.inputSchema,
    handler: inspectUrl.handler,
  },
  {
    name: submitUrl.name,
    description: submitUrl.description,
    inputSchema: submitUrl.inputSchema,
    handler: submitUrl.handler,
  },
  {
    name: comparePeriods.name,
    description: comparePeriods.description,
    inputSchema: comparePeriods.inputSchema,
    handler: comparePeriods.handler,
  },
];

// Create MCP server
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

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = tools.find((t) => t.name === toolName);

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    return await tool.handler(request.params.arguments as any, authClient);
  } catch (error: any) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
