/**
 * Google OAuth 2.0 Authentication
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import { OAuth2Client } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Create and configure OAuth2 client
 */
export function createAuthClient(): OAuth2Client {
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

/**
 * Get authorization URL for initial setup
 */
export function getAuthUrl(oauth2Client: OAuth2Client): string {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/indexing', // For submit_url_for_indexing tool
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(
  oauth2Client: OAuth2Client,
  code: string
) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}
