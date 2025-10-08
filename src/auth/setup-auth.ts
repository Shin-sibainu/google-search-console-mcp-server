#!/usr/bin/env node

/**
 * Initial authentication setup CLI
 * Run this script to obtain a refresh token
 */

import http from 'http';
import { URL } from 'url';
import { createAuthClient, getAuthUrl, getTokensFromCode } from './google-auth.js';

const PORT = 8080;

async function main() {
  console.log('='.repeat(60));
  console.log('Google Search Console MCP Server - Authentication Setup');
  console.log('='.repeat(60));
  console.log();

  try {
    // Create OAuth2 client
    const oauth2Client = createAuthClient();

    // Generate authorization URL
    const authUrl = getAuthUrl(oauth2Client);

    console.log('Step 1: Visit the following URL in your browser:');
    console.log();
    console.log(authUrl);
    console.log();
    console.log(`Step 2: Waiting for authorization on http://localhost:${PORT}...`);
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
    console.log('Add the following to your .env file:');
    console.log();
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log();
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error();
    console.error('Error during authentication:', error.message);
    process.exit(1);
  }
}

main();
