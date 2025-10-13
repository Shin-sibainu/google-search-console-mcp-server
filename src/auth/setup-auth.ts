#!/usr/bin/env node

/**
 * Initial authentication setup CLI
 * Run this script to obtain a refresh token
 */

import http from 'http';
import { URL } from 'url';
import readline from 'readline';
import { google } from 'googleapis';
import { getAuthUrl, getTokensFromCode } from './google-auth.js';

/**
 * Prompt for user input
 */
function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} [press Enter for default: ${defaultValue}]: `
      : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Google Search Console MCP Server - Authentication Setup');
  console.log('='.repeat(60));
  console.log();
  console.log('Enter your Google OAuth credentials:');
  console.log();

  try {
    // Get credentials interactively
    const clientId = process.env.GOOGLE_CLIENT_ID || await prompt('GOOGLE_CLIENT_ID');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || await prompt('GOOGLE_CLIENT_SECRET');
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || await prompt('GOOGLE_REDIRECT_URI', 'http://localhost:8080');

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    console.log();

    // Extract port from redirect URI
    const redirectUrl = new URL(redirectUri);
    const PORT = parseInt(redirectUrl.port || '8080', 10);

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generate authorization URL
    const authUrl = getAuthUrl(oauth2Client);

    console.log('Step 1: Visit the following URL in your browser:');
    console.log();
    console.log(authUrl);
    console.log();
    console.log(`Step 2: Waiting for authorization on ${redirectUri}...`);
    console.log();

    // Create HTTP server to receive the authorization code
    const code = await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Bad Request</h1>');
          return;
        }

        const url = new URL(req.url, `http://localhost:${PORT}`);
        const authCode = url.searchParams.get('code');

        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
          server.close();
          resolve(authCode);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          server.close();
          reject(new Error('No authorization code received'));
        }
      });

      server.listen(PORT, () => {
        console.log(`Listening on http://localhost:${PORT}`);
      });

      server.on('error', (err) => {
        reject(err);
      });
    });

    console.log();
    console.log('Exchanging authorization code for tokens...');

    // Exchange code for tokens
    const tokens = await getTokensFromCode(oauth2Client, code);

    console.log();
    console.log('Success! Authentication completed.');
    console.log('='.repeat(60));
    console.log();
    console.log('Add the following to your .mcp.json:');
    console.log();
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log();
    console.log('Example .mcp.json:');
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
    console.log();
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error();
    console.error('Error during authentication:', error.message);

    // Display detailed error information for debugging
    if (error.response) {
      console.error('\nDetailed error information:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.code) {
      console.error('Error code:', error.code);
    }

    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
