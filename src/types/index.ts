/**
 * Type definitions for Google Search Console MCP Server
 */

import { google } from 'googleapis';

// Google Auth Client Type
export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// Site Information
export interface Site {
  siteUrl: string;
  permissionLevel: string;
}

// Analytics Query Request
export interface AnalyticsRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
}

// Analytics Row
export interface AnalyticsRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Analytics Response
export interface AnalyticsResponse {
  rows: AnalyticsRow[];
  responseAggregationType?: string;
}

// Sitemap Information
export interface SitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  warnings?: string;
  errors?: string;
  contents?: Array<{
    type: string;
    submitted: string;
    indexed: string;
  }>;
}

// URL Inspection Request
export interface InspectionRequest {
  siteUrl: string;
  inspectionUrl: string;
}

// URL Inspection Result
export interface InspectionResult {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      crawledAs?: string;
    };
    mobileUsabilityResult?: {
      verdict?: string;
      issues?: Array<{
        issueType?: string;
        message?: string;
      }>;
    };
    richResultsResult?: {
      verdict?: string;
      detectedItems?: Array<{
        richResultType?: string;
        items?: any[];
      }>;
    };
  };
}
