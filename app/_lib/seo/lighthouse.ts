import "server-only";

// Lighthouse score categories from PageSpeed Insights API
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseAuditResult {
  scores: LighthouseScores;
  rawData: PageSpeedResponse;
  fetchedAt: string;
}

export interface LighthouseError {
  code: string;
  message: string;
}

// PageSpeed Insights API response types
interface LighthouseCategoryResult {
  id: string;
  title: string;
  score: number | null;
}

interface LighthouseResult {
  categories: {
    performance?: LighthouseCategoryResult;
    accessibility?: LighthouseCategoryResult;
    "best-practices"?: LighthouseCategoryResult;
    seo?: LighthouseCategoryResult;
  };
  audits: Record<string, unknown>;
  configSettings?: Record<string, unknown>;
  timing?: { total: number };
  finalUrl?: string;
}

interface PageSpeedResponse {
  captchaResult?: string;
  kind?: string;
  id?: string;
  loadingExperience?: Record<string, unknown>;
  originLoadingExperience?: Record<string, unknown>;
  lighthouseResult?: LighthouseResult;
  analysisUTCTimestamp?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Run a Lighthouse audit on the given URL using Google PageSpeed Insights API.
 *
 * @param url - The URL to audit (must be a valid https:// URL)
 * @returns LighthouseAuditResult with scores and raw data, or LighthouseError on failure
 */
export async function runLighthouseAudit(
  url: string
): Promise<LighthouseAuditResult | LighthouseError> {
  // Validate URL
  if (!url) {
    return {
      code: "INVALID_URL",
      message: "URL is required",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      code: "INVALID_URL",
      message: "Invalid URL format. Please provide a valid URL.",
    };
  }

  // Only allow http/https protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return {
      code: "INVALID_URL",
      message: "URL must use http or https protocol.",
    };
  }

  // Build API request URL
  const apiUrl = new URL(PAGESPEED_API_URL);
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("strategy", "mobile"); // mobile-first approach
  apiUrl.searchParams.set("category", "performance");
  apiUrl.searchParams.append("category", "accessibility");
  apiUrl.searchParams.append("category", "best-practices");
  apiUrl.searchParams.append("category", "seo");

  // Add API key if available (higher rate limits: 25k/day with key vs 400/day without)
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (apiKey) {
    apiUrl.searchParams.set("key", apiKey);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = `PageSpeed API error: ${response.status}`;

      try {
        const errorData = await response.json() as PageSpeedResponse;
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignore JSON parse errors for error response
      }

      // Handle specific error codes
      if (response.status === 400) {
        return {
          code: "BAD_REQUEST",
          message: `Unable to audit URL. ${errorMessage}`,
        };
      }
      if (response.status === 429) {
        return {
          code: "RATE_LIMITED",
          message: "PageSpeed API rate limit exceeded. Please try again later.",
        };
      }
      if (response.status === 500 || response.status === 503) {
        return {
          code: "API_UNAVAILABLE",
          message: "PageSpeed API is temporarily unavailable. Please try again later.",
        };
      }

      return {
        code: "API_ERROR",
        message: errorMessage,
      };
    }

    const data = await response.json() as PageSpeedResponse;

    // Check for API-level error in response
    if (data.error) {
      return {
        code: "API_ERROR",
        message: data.error.message || "Unknown PageSpeed API error",
      };
    }

    // Extract lighthouse results
    const lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult?.categories) {
      return {
        code: "NO_RESULTS",
        message: "PageSpeed API returned no Lighthouse results for this URL.",
      };
    }

    const categories = lighthouseResult.categories;

    // Extract scores (convert from 0-1 to 0-100)
    const scores: LighthouseScores = {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
    };

    return {
      scores,
      rawData: data,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Network or other errors
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      code: "NETWORK_ERROR",
      message: `Failed to connect to PageSpeed API: ${message}`,
    };
  }
}

/**
 * Type guard to check if the result is an error
 */
export function isLighthouseError(
  result: LighthouseAuditResult | LighthouseError
): result is LighthouseError {
  return "code" in result && "message" in result && !("scores" in result);
}
