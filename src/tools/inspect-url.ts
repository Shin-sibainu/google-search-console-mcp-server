/**
 * Inspect URL Tool
 * Inspect the indexing status of a specific URL
 */

import { google } from 'googleapis';
import { OAuth2Client, InspectionRequest, InspectionResult } from '../types/index.js';
import { handleApiError, retryWithBackoff, validateSiteUrl, SearchConsoleError } from '../utils/error-handler.js';

export const name = 'inspect_url';

export const description =
  'Inspect the indexing status of a specific URL in Google Search Console';

export const inputSchema = {
  type: 'object',
  properties: {
    siteUrl: {
      type: 'string',
      description: 'The site URL (e.g., "https://example.com/")',
    },
    inspectionUrl: {
      type: 'string',
      description: 'The full URL to inspect (e.g., "https://example.com/page")',
    },
  },
  required: ['siteUrl', 'inspectionUrl'],
};

/**
 * Handler for inspecting URL indexing status
 * Returns detailed information about URL's index status, mobile usability, and rich results
 */
export async function handler(args: InspectionRequest, authClient: OAuth2Client) {
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  const { siteUrl, inspectionUrl } = args;

  // Validate inputs
  validateSiteUrl(siteUrl);

  if (!inspectionUrl) {
    throw new SearchConsoleError(
      'Inspection URL is required',
      400,
      'Please provide a valid URL to inspect'
    );
  }

  // Validate inspectionUrl format
  try {
    new URL(inspectionUrl);
  } catch {
    throw new SearchConsoleError(
      'Invalid inspection URL format',
      400,
      'Inspection URL must be a valid URL (e.g., "https://example.com/page")'
    );
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl,
          siteUrl,
        },
      });
    });

    const result: InspectionResult = {
      inspectionResult: {
        indexStatusResult: {
          verdict: response.data.inspectionResult?.indexStatusResult?.verdict || undefined,
          coverageState: response.data.inspectionResult?.indexStatusResult?.coverageState || undefined,
          robotsTxtState: response.data.inspectionResult?.indexStatusResult?.robotsTxtState || undefined,
          indexingState: response.data.inspectionResult?.indexStatusResult?.indexingState || undefined,
          lastCrawlTime: response.data.inspectionResult?.indexStatusResult?.lastCrawlTime || undefined,
          pageFetchState: response.data.inspectionResult?.indexStatusResult?.pageFetchState || undefined,
          googleCanonical: response.data.inspectionResult?.indexStatusResult?.googleCanonical || undefined,
          userCanonical: response.data.inspectionResult?.indexStatusResult?.userCanonical || undefined,
          crawledAs: response.data.inspectionResult?.indexStatusResult?.crawledAs || undefined,
        },
        mobileUsabilityResult: {
          verdict: response.data.inspectionResult?.mobileUsabilityResult?.verdict || undefined,
          issues: response.data.inspectionResult?.mobileUsabilityResult?.issues?.map(
            (issue) => ({
              issueType: issue.issueType || undefined,
              message: issue.message || undefined,
            })
          ),
        },
        richResultsResult: {
          verdict: response.data.inspectionResult?.richResultsResult?.verdict || undefined,
          detectedItems: response.data.inspectionResult?.richResultsResult?.detectedItems?.map(
            (item) => ({
              richResultType: item.richResultType || undefined,
              items: item.items,
            })
          ),
        },
      },
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
    handleApiError(error, 'inspect URL');
  }
}
