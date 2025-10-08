/**
 * Get Analytics Tool
 * Query search performance data from Google Search Console
 */

import { google } from 'googleapis';
import { OAuth2Client, AnalyticsRequest, AnalyticsResponse } from '../types/index.js';
import { handleApiError, retryWithBackoff, validateSiteUrl, validateDateRange } from '../utils/error-handler.js';

export const name = 'get_analytics';

export const description =
  'Query search performance data from Google Search Console for a specified date range';

export const inputSchema = {
  type: 'object',
  properties: {
    siteUrl: {
      type: 'string',
      description: 'The site URL (e.g., "https://example.com/")',
    },
    startDate: {
      type: 'string',
      description: 'Start date in YYYY-MM-DD format',
    },
    endDate: {
      type: 'string',
      description: 'End date in YYYY-MM-DD format',
    },
    dimensions: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['query', 'page', 'country', 'device', 'searchAppearance'],
      },
      description:
        'Dimensions to group results by (e.g., ["query"], ["page", "device"])',
    },
    rowLimit: {
      type: 'number',
      description: 'Maximum number of rows to return (default: 100, max: 25000)',
      default: 100,
    },
    startRow: {
      type: 'number',
      description: 'Starting row for pagination (default: 0)',
      default: 0,
    },
  },
  required: ['siteUrl', 'startDate', 'endDate'],
};

/**
 * Handler for querying search analytics data
 * Validates inputs and retrieves performance data with retry logic
 */
export async function handler(args: AnalyticsRequest, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  const { siteUrl, startDate, endDate, dimensions, rowLimit = 100, startRow = 0 } = args;

  // Validate inputs
  validateSiteUrl(siteUrl);
  validateDateRange(startDate, endDate);

  // Validate rowLimit
  if (rowLimit < 1 || rowLimit > 25000) {
    throw new Error('rowLimit must be between 1 and 25000');
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: dimensions || [],
          rowLimit,
          startRow,
        },
      });
    });

    const result: AnalyticsResponse = {
      rows: (response.data.rows || []).map((row) => ({
        keys: row.keys || undefined,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })),
      responseAggregationType: response.data.responseAggregationType || undefined,
    };

    // Add helpful metadata
    const metadata = {
      ...result,
      totalRows: result.rows.length,
      dateRange: { startDate, endDate },
      dimensions: dimensions || [],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  } catch (error: any) {
    handleApiError(error, 'get analytics data');
  }
}
