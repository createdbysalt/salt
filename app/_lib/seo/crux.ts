import "server-only";

// Core Web Vitals metrics with thresholds
export type ThresholdStatus = "good" | "needs-improvement" | "poor";

export interface WebVitalMetric {
  value: number; // p75 value in milliseconds (LCP, INP) or as a ratio (CLS)
  status: ThresholdStatus;
}

export interface CoreWebVitals {
  lcp: WebVitalMetric; // Largest Contentful Paint (ms)
  inp: WebVitalMetric; // Interaction to Next Paint (ms) - replaces FID
  cls: WebVitalMetric; // Cumulative Layout Shift (unitless)
  fetchedAt: string;
}

export interface CruxError {
  code: string;
  message: string;
}

// CrUX API response types
interface CruxMetricPercentiles {
  p75: number;
}

interface CruxMetricHistogramBin {
  start: number;
  end?: number;
  density: number;
}

interface CruxMetric {
  histogram?: CruxMetricHistogramBin[];
  percentiles?: CruxMetricPercentiles;
}

interface CruxRecord {
  key?: {
    origin?: string;
    url?: string;
    formFactor?: string;
  };
  metrics?: {
    largest_contentful_paint?: CruxMetric;
    interaction_to_next_paint?: CruxMetric;
    cumulative_layout_shift?: CruxMetric;
    first_contentful_paint?: CruxMetric;
    first_input_delay?: CruxMetric;
    experimental_time_to_first_byte?: CruxMetric;
  };
  collectionPeriod?: {
    firstDate?: { year: number; month: number; day: number };
    lastDate?: { year: number; month: number; day: number };
  };
}

interface CruxResponse {
  record?: CruxRecord;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

const CRUX_API_URL = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

// Core Web Vitals thresholds (based on Google's recommendations)
// https://web.dev/lcp/ - LCP: Good <2500ms, Needs Improvement 2500-4000ms, Poor >4000ms
// https://web.dev/inp/ - INP: Good <200ms, Needs Improvement 200-500ms, Poor >500ms
// https://web.dev/cls/ - CLS: Good <0.1, Needs Improvement 0.1-0.25, Poor >0.25

const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // milliseconds
  inp: { good: 200, poor: 500 }, // milliseconds
  cls: { good: 0.1, poor: 0.25 }, // unitless ratio
} as const;

function getThresholdStatus(
  value: number,
  thresholds: { good: number; poor: number }
): ThresholdStatus {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
}

/**
 * Get Core Web Vitals from Chrome UX Report for a domain.
 *
 * @param domain - The domain to query (e.g., "example.com" or "https://example.com")
 * @returns CoreWebVitals with LCP, INP, CLS metrics and thresholds, null if insufficient data, or CruxError on failure
 */
export async function getCoreWebVitals(
  domain: string
): Promise<CoreWebVitals | null | CruxError> {
  // Require API key
  const apiKey = process.env.CRUX_API_KEY;
  if (!apiKey) {
    return {
      code: "MISSING_API_KEY",
      message: "CRUX_API_KEY environment variable is required for Chrome UX Report API.",
    };
  }

  // Validate and normalize domain
  if (!domain) {
    return {
      code: "INVALID_DOMAIN",
      message: "Domain is required",
    };
  }

  // Normalize domain to origin format (https://example.com)
  let origin: string;
  try {
    // Handle both "example.com" and "https://example.com" formats
    const urlString = domain.includes("://") ? domain : `https://${domain}`;
    const parsedUrl = new URL(urlString);
    origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch {
    return {
      code: "INVALID_DOMAIN",
      message: "Invalid domain format. Please provide a valid domain.",
    };
  }

  const requestBody = {
    origin: origin,
    formFactor: "PHONE", // Mobile data (most common)
  };

  try {
    const response = await fetch(`${CRUX_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Handle 404 - domain has insufficient traffic data
    if (response.status === 404) {
      // This is not an error - it means the domain doesn't have enough traffic
      return null;
    }

    if (!response.ok) {
      let errorMessage = `CrUX API error: ${response.status}`;

      try {
        const errorData = (await response.json()) as CruxResponse;
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignore JSON parse errors for error response
      }

      if (response.status === 400) {
        return {
          code: "BAD_REQUEST",
          message: `Invalid request. ${errorMessage}`,
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          code: "AUTH_ERROR",
          message: "Invalid or expired CRUX_API_KEY. Please check your API key.",
        };
      }
      if (response.status === 429) {
        return {
          code: "RATE_LIMITED",
          message: "CrUX API rate limit exceeded. Please try again later.",
        };
      }
      if (response.status === 500 || response.status === 503) {
        return {
          code: "API_UNAVAILABLE",
          message: "CrUX API is temporarily unavailable. Please try again later.",
        };
      }

      return {
        code: "API_ERROR",
        message: errorMessage,
      };
    }

    const data = (await response.json()) as CruxResponse;

    // Check for API-level error in response
    if (data.error) {
      // Error code 404 in body also means insufficient data
      if (data.error.code === 404) {
        return null;
      }
      return {
        code: "API_ERROR",
        message: data.error.message || "Unknown CrUX API error",
      };
    }

    // Extract metrics from record
    const record = data.record;
    if (!record?.metrics) {
      // No metrics available - insufficient data
      return null;
    }

    const metrics = record.metrics;

    // Extract p75 values for each metric
    const lcpP75 = metrics.largest_contentful_paint?.percentiles?.p75;
    const inpP75 = metrics.interaction_to_next_paint?.percentiles?.p75;
    const clsP75 = metrics.cumulative_layout_shift?.percentiles?.p75;

    // If any core metric is missing, consider it insufficient data
    if (lcpP75 === undefined || inpP75 === undefined || clsP75 === undefined) {
      return null;
    }

    return {
      lcp: {
        value: lcpP75,
        status: getThresholdStatus(lcpP75, THRESHOLDS.lcp),
      },
      inp: {
        value: inpP75,
        status: getThresholdStatus(inpP75, THRESHOLDS.inp),
      },
      cls: {
        value: clsP75,
        status: getThresholdStatus(clsP75, THRESHOLDS.cls),
      },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Network or other errors
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      code: "NETWORK_ERROR",
      message: `Failed to connect to CrUX API: ${message}`,
    };
  }
}

/**
 * Type guard to check if the result is an error
 */
export function isCruxError(
  result: CoreWebVitals | null | CruxError
): result is CruxError {
  return result !== null && "code" in result && "message" in result && !("lcp" in result);
}
