/**
 * List Sites Tool
 * Returns all Search Console sites accessible to the user
 */

import { google } from 'googleapis';
import { OAuth2Client, Site } from '../types/index.js';
import { handleApiError, retryWithBackoff } from '../utils/error-handler.js';

export const name = 'list_sites';

export const description = 'List all Google Search Console sites accessible to the user';

export const inputSchema = {
  type: 'object',
  properties: {},
  required: [],
};

/**
 * Handler for listing Search Console sites
 * Retrieves all sites the authenticated user has access to
 */
export async function handler(args: Record<string, never>, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.sites.list();
    });

    const sites: Site[] = (response.data.siteEntry || []).map((site) => ({
      siteUrl: site.siteUrl || '',
      permissionLevel: site.permissionLevel || 'unknown',
    }));

    if (sites.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              sites: [],
              message: 'No Search Console sites found. Make sure you have added sites to Search Console and have the necessary permissions.'
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ sites, count: sites.length }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    handleApiError(error, 'list sites');
  }
}
