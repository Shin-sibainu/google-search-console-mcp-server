/**
 * Error handling utilities for Google Search Console API
 */

/**
 * Custom error class for Google Search Console API errors
 */
export class SearchConsoleError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'SearchConsoleError';
  }
}

/**
 * Handle Google API errors and convert to user-friendly messages
 */
export function handleApiError(error: any, context: string): never {
  const errorCode = error.code || error.response?.status;
  const errorMessage = error.message || 'Unknown error';

  switch (errorCode) {
    case 400:
      throw new SearchConsoleError(
        `Invalid request to ${context}: ${errorMessage}`,
        400,
        'Check that your site URL and parameters are correct'
      );

    case 401:
    case 403:
      throw new SearchConsoleError(
        `Access denied for ${context}`,
        errorCode,
        'Verify your authentication credentials and ensure you have access to this Search Console property. ' +
        'You may need to add your account as a test user in Google Cloud Console.'
      );

    case 404:
      throw new SearchConsoleError(
        `Resource not found for ${context}`,
        404,
        'The site or URL may not exist in Search Console. Verify the site URL is correct.'
      );

    case 429:
      throw new SearchConsoleError(
        `Rate limit exceeded for ${context}`,
        429,
        'Too many requests. Please wait a moment and try again. ' +
        'Daily quota: 2,000 requests, Per 100 seconds: 600 requests.'
      );

    case 500:
    case 502:
    case 503:
      throw new SearchConsoleError(
        `Google API server error for ${context}`,
        errorCode,
        'The Google API is temporarily unavailable. Please try again later.'
      );

    default:
      throw new SearchConsoleError(
        `Failed to ${context}: ${errorMessage}`,
        errorCode,
        error.details || 'An unexpected error occurred'
      );
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx except 429)
      const errorCode = error.code || error.response?.status;
      if (errorCode && errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd

      console.error(`Attempt ${attempt + 1} failed, retrying in ${delay + jitter}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

/**
 * Validate site URL format
 */
export function validateSiteUrl(siteUrl: string): void {
  if (!siteUrl) {
    throw new SearchConsoleError(
      'Site URL is required',
      400,
      'Please provide a valid site URL'
    );
  }

  // Check if it's a valid URL format
  try {
    new URL(siteUrl);
  } catch {
    throw new SearchConsoleError(
      'Invalid site URL format',
      400,
      'Site URL must be a valid URL (e.g., "https://example.com/" or "sc-domain:example.com")'
    );
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(date: string, fieldName: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(date)) {
    throw new SearchConsoleError(
      `Invalid ${fieldName} format`,
      400,
      `${fieldName} must be in YYYY-MM-DD format (e.g., "2025-01-01")`
    );
  }

  // Check if it's a valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new SearchConsoleError(
      `Invalid ${fieldName}`,
      400,
      `${fieldName} is not a valid date`
    );
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): void {
  validateDate(startDate, 'startDate');
  validateDate(endDate, 'endDate');

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new SearchConsoleError(
      'Invalid date range',
      400,
      'startDate must be before or equal to endDate'
    );
  }

  // Check if dates are not too far in the past (16 months limit)
  const sixteenMonthsAgo = new Date();
  sixteenMonthsAgo.setMonth(sixteenMonthsAgo.getMonth() - 16);

  if (start < sixteenMonthsAgo) {
    throw new SearchConsoleError(
      'Date range too old',
      400,
      'Search Console data is only available for the last 16 months'
    );
  }
}
