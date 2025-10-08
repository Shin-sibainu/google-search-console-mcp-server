/**
 * Compare Periods Tool
 * Compare search performance between two time periods
 */

import { google } from 'googleapis';
import { OAuth2Client } from '../types/index.js';
import { handleApiError, retryWithBackoff, validateSiteUrl, validateDateRange } from '../utils/error-handler.js';

export const name = 'compare_periods';

export const description =
  'Compare search performance metrics between two time periods (e.g., this week vs last week)';

export const inputSchema = {
  type: 'object',
  properties: {
    siteUrl: {
      type: 'string',
      description: 'The site URL (e.g., "https://example.com/")',
    },
    currentStartDate: {
      type: 'string',
      description: 'Current period start date (YYYY-MM-DD)',
    },
    currentEndDate: {
      type: 'string',
      description: 'Current period end date (YYYY-MM-DD)',
    },
    previousStartDate: {
      type: 'string',
      description: 'Previous period start date (YYYY-MM-DD)',
    },
    previousEndDate: {
      type: 'string',
      description: 'Previous period end date (YYYY-MM-DD)',
    },
    dimensions: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['query', 'page', 'country', 'device', 'searchAppearance'],
      },
      description: 'Dimensions to group results by (e.g., ["query"])',
    },
    rowLimit: {
      type: 'number',
      description: 'Maximum number of rows to return (default: 100, max: 25000)',
      default: 100,
    },
  },
  required: ['siteUrl', 'currentStartDate', 'currentEndDate', 'previousStartDate', 'previousEndDate'],
};

interface ComparePeriodRequest {
  siteUrl: string;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  dimensions?: string[];
  rowLimit?: number;
}

interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

/**
 * Handler for comparing performance between two periods
 * Retrieves data for both periods and calculates change percentages
 */
export async function handler(args: ComparePeriodRequest, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  const {
    siteUrl,
    currentStartDate,
    currentEndDate,
    previousStartDate,
    previousEndDate,
    dimensions = [],
    rowLimit = 100,
  } = args;

  // Validate inputs
  validateSiteUrl(siteUrl);
  validateDateRange(currentStartDate, currentEndDate);
  validateDateRange(previousStartDate, previousEndDate);

  if (rowLimit < 1 || rowLimit > 25000) {
    throw new Error('rowLimit must be between 1 and 25000');
  }

  try {
    // Fetch data for both periods in parallel
    const [currentResponse, previousResponse] = await Promise.all([
      retryWithBackoff(async () => {
        return await searchconsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: currentStartDate,
            endDate: currentEndDate,
            dimensions,
            rowLimit,
          },
        });
      }),
      retryWithBackoff(async () => {
        return await searchconsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: previousStartDate,
            endDate: previousEndDate,
            dimensions,
            rowLimit,
          },
        });
      }),
    ]);

    const currentRows = currentResponse.data.rows || [];
    const previousRows = previousResponse.data.rows || [];

    // Create a map of previous period data for easy lookup
    const previousMap = new Map<string, any>();
    previousRows.forEach((row) => {
      const key = row.keys?.join('|') || 'total';
      previousMap.set(key, row);
    });

    // Calculate comparisons
    const comparisons = currentRows.map((currentRow) => {
      const key = currentRow.keys?.join('|') || 'total';
      const previousRow = previousMap.get(key);

      const calculateChange = (current: number, previous: number): MetricComparison => {
        const change = current - previous;
        const changePercent = previous > 0 ? (change / previous) * 100 : 0;
        return {
          current,
          previous,
          change,
          changePercent: Math.round(changePercent * 100) / 100, // Round to 2 decimal places
        };
      };

      return {
        keys: currentRow.keys,
        clicks: calculateChange(
          currentRow.clicks || 0,
          previousRow?.clicks || 0
        ),
        impressions: calculateChange(
          currentRow.impressions || 0,
          previousRow?.impressions || 0
        ),
        ctr: calculateChange(
          currentRow.ctr || 0,
          previousRow?.ctr || 0
        ),
        position: calculateChange(
          currentRow.position || 0,
          previousRow?.position || 0
        ),
      };
    });

    // Calculate overall totals
    const currentTotals = {
      clicks: currentRows.reduce((sum, row) => sum + (row.clicks || 0), 0),
      impressions: currentRows.reduce((sum, row) => sum + (row.impressions || 0), 0),
      ctr: currentRows.length > 0
        ? currentRows.reduce((sum, row) => sum + (row.ctr || 0), 0) / currentRows.length
        : 0,
      position: currentRows.length > 0
        ? currentRows.reduce((sum, row) => sum + (row.position || 0), 0) / currentRows.length
        : 0,
    };

    const previousTotals = {
      clicks: previousRows.reduce((sum, row) => sum + (row.clicks || 0), 0),
      impressions: previousRows.reduce((sum, row) => sum + (row.impressions || 0), 0),
      ctr: previousRows.length > 0
        ? previousRows.reduce((sum, row) => sum + (row.ctr || 0), 0) / previousRows.length
        : 0,
      position: previousRows.length > 0
        ? previousRows.reduce((sum, row) => sum + (row.position || 0), 0) / previousRows.length
        : 0,
    };

    const calculateChange = (current: number, previous: number): MetricComparison => {
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      return {
        current,
        previous,
        change,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    };

    const result = {
      periods: {
        current: { startDate: currentStartDate, endDate: currentEndDate },
        previous: { startDate: previousStartDate, endDate: previousEndDate },
      },
      totals: {
        clicks: calculateChange(currentTotals.clicks, previousTotals.clicks),
        impressions: calculateChange(currentTotals.impressions, previousTotals.impressions),
        ctr: calculateChange(currentTotals.ctr, previousTotals.ctr),
        position: calculateChange(currentTotals.position, previousTotals.position),
      },
      rows: comparisons,
      dimensions: dimensions,
      totalRows: comparisons.length,
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
    handleApiError(error, 'compare periods');
  }
}
