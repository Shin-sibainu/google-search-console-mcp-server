/**
 * Get Sitemaps Tool
 * Retrieve sitemap information for a site
 */

import { google } from 'googleapis';
import { OAuth2Client, SitemapInfo } from '../types/index.js';
import { handleApiError, retryWithBackoff, validateSiteUrl } from '../utils/error-handler.js';

export const name = 'get_sitemaps';

export const description = 'Retrieve sitemap information for a Google Search Console site';

export const inputSchema = {
  type: 'object',
  properties: {
    siteUrl: {
      type: 'string',
      description: 'The site URL (e.g., "https://example.com/")',
    },
  },
  required: ['siteUrl'],
};

interface GetSitemapsRequest {
  siteUrl: string;
}

/**
 * Handler for retrieving sitemap information
 * Returns sitemap status, errors, warnings, and indexing statistics
 */
export async function handler(args: GetSitemapsRequest, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  const { siteUrl } = args;

  // Validate inputs
  validateSiteUrl(siteUrl);

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.sitemaps.list({
        siteUrl,
      });
    });

    const sitemaps: SitemapInfo[] = (response.data.sitemap || []).map((sitemap) => ({
      path: sitemap.path || '',
      lastSubmitted: sitemap.lastSubmitted || undefined,
      isPending: sitemap.isPending || undefined,
      isSitemapsIndex: sitemap.isSitemapsIndex || undefined,
      type: sitemap.type || undefined,
      warnings: sitemap.warnings?.toString(),
      errors: sitemap.errors?.toString(),
      contents: sitemap.contents?.map((content) => ({
        type: content.type || '',
        submitted: content.submitted?.toString() || '0',
        indexed: content.indexed?.toString() || '0',
      })),
    }));

    if (sitemaps.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              sitemaps: [],
              message: 'No sitemaps found for this site. You may need to submit a sitemap in Search Console.'
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ sitemaps, count: sitemaps.length }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    handleApiError(error, 'get sitemaps');
  }
}
