/**
 * Submit URL for Indexing Tool
 * Request indexing or removal of a URL
 */

import { google } from 'googleapis';
import { OAuth2Client } from '../types/index.js';
import { handleApiError, retryWithBackoff, SearchConsoleError } from '../utils/error-handler.js';

export const name = 'submit_url_for_indexing';

export const description =
  'Submit a URL to Google for indexing or request URL removal (requires Indexing API enabled)';

export const inputSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'The full URL to submit (e.g., "https://example.com/page")',
    },
    type: {
      type: 'string',
      enum: ['URL_UPDATED', 'URL_DELETED'],
      description: 'Type of notification: URL_UPDATED (request indexing) or URL_DELETED (request removal)',
      default: 'URL_UPDATED',
    },
  },
  required: ['url'],
};

interface SubmitUrlRequest {
  url: string;
  type?: 'URL_UPDATED' | 'URL_DELETED';
}

/**
 * Handler for submitting URL indexing requests
 * Uses Google Indexing API to notify Google about URL updates or deletions
 *
 * Note: Requires Indexing API to be enabled in Google Cloud Console
 * Scope required: https://www.googleapis.com/auth/indexing
 */
export async function handler(args: SubmitUrlRequest, authClient: OAuth2Client) {
  const indexing = google.indexing({ version: 'v3', auth: authClient });

  const { url, type = 'URL_UPDATED' } = args;

  // Validate URL
  if (!url) {
    throw new SearchConsoleError(
      'URL is required',
      400,
      'Please provide a valid URL to submit'
    );
  }

  try {
    new URL(url);
  } catch {
    throw new SearchConsoleError(
      'Invalid URL format',
      400,
      'URL must be a valid URL (e.g., "https://example.com/page")'
    );
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type,
        },
      });
    });

    const result = {
      success: true,
      url: url,
      type: type,
      notifyTime: new Date().toISOString(),
      message: type === 'URL_UPDATED'
        ? `Successfully submitted URL for indexing. Google will crawl this URL soon.`
        : `Successfully requested URL removal from index.`,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Check for common Indexing API errors
    if (error.code === 403) {
      throw new SearchConsoleError(
        'Indexing API not enabled or insufficient permissions',
        403,
        'Enable the Indexing API in Google Cloud Console and ensure your OAuth credentials have the "https://www.googleapis.com/auth/indexing" scope. ' +
        'You may also need to verify ownership of the URL in Search Console.'
      );
    }

    handleApiError(error, 'submit URL for indexing');
  }
}
