/**
 * Vercel Domain Manager
 * 
 * Programmatic domain management via Vercel API.
 * Used for custom domain provisioning in Bridge white-labeling.
 * 
 * API Reference: https://vercel.com/docs/rest-api/endpoints#domains
 */

const VERCEL_API_BASE = "https://api.vercel.com";

// Environment variables
const getEnvVars = () => ({
  token: process.env.VERCEL_API_TOKEN,
  projectId: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
});

// Types
export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: VercelVerification[];
  gitBranch?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VercelVerification {
  type: "TXT" | "CNAME";
  domain: string;
  value: string;
  reason: string;
}

export interface DomainConfig {
  configuredBy?: "CNAME" | "A" | "http";
  acceptedChallenges?: ("dns-01" | "http-01")[];
  misconfigured: boolean;
}

export interface DomainStatus {
  domain: VercelDomain | null;
  config: DomainConfig | null;
  verified: boolean;
  sslReady: boolean;
  error?: string;
}

export interface AddDomainResult {
  success: boolean;
  domain?: VercelDomain;
  error?: string;
  verification?: VercelVerification[];
}

// Error class for Vercel API errors
export class VercelAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = "VercelAPIError";
  }
}

/**
 * Make authenticated request to Vercel API
 */
async function vercelFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { token, teamId } = getEnvVars();

  if (!token) {
    throw new VercelAPIError("VERCEL_API_TOKEN not configured", 500);
  }

  // Build URL with team ID if present
  const url = new URL(endpoint, VERCEL_API_BASE);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new VercelAPIError(
      errorBody.error?.message || `Vercel API error: ${response.status}`,
      response.status,
      errorBody.error?.code
    );
  }

  return response.json();
}

/**
 * Add a custom domain to the Vercel project
 */
export async function addDomain(hostname: string): Promise<AddDomainResult> {
  const { projectId } = getEnvVars();

  if (!projectId) {
    return { success: false, error: "VERCEL_PROJECT_ID not configured" };
  }

  try {
    const domain = await vercelFetch<VercelDomain>(
      `/v10/projects/${projectId}/domains`,
      {
        method: "POST",
        body: JSON.stringify({ name: hostname }),
      }
    );

    return {
      success: true,
      domain,
      verification: domain.verification,
    };
  } catch (error) {
    if (error instanceof VercelAPIError) {
      // Handle specific error codes
      if (error.code === "domain_already_in_use") {
        return {
          success: false,
          error: "This domain is already in use by another project",
        };
      }
      if (error.code === "invalid_domain") {
        return {
          success: false,
          error: "Invalid domain format. Please enter a valid domain name.",
        };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to add domain" };
  }
}

/**
 * Remove a custom domain from the Vercel project
 */
export async function removeDomain(hostname: string): Promise<{ success: boolean; error?: string }> {
  const { projectId } = getEnvVars();

  if (!projectId) {
    return { success: false, error: "VERCEL_PROJECT_ID not configured" };
  }

  try {
    await vercelFetch(`/v9/projects/${projectId}/domains/${hostname}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof VercelAPIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to remove domain" };
  }
}

/**
 * Get domain configuration and verification status
 */
export async function getDomainStatus(hostname: string): Promise<DomainStatus> {
  const { projectId } = getEnvVars();

  if (!projectId) {
    return {
      domain: null,
      config: null,
      verified: false,
      sslReady: false,
      error: "VERCEL_PROJECT_ID not configured",
    };
  }

  try {
    // Get domain info
    const domain = await vercelFetch<VercelDomain>(
      `/v9/projects/${projectId}/domains/${hostname}`
    );

    // Get domain configuration (DNS setup status)
    const config = await vercelFetch<DomainConfig>(
      `/v6/domains/${hostname}/config`
    );

    return {
      domain,
      config,
      verified: domain.verified,
      sslReady: !config.misconfigured && domain.verified,
    };
  } catch (error) {
    if (error instanceof VercelAPIError) {
      if (error.statusCode === 404) {
        return {
          domain: null,
          config: null,
          verified: false,
          sslReady: false,
          error: "Domain not found in project",
        };
      }
      return {
        domain: null,
        config: null,
        verified: false,
        sslReady: false,
        error: error.message,
      };
    }
    return {
      domain: null,
      config: null,
      verified: false,
      sslReady: false,
      error: "Failed to get domain status",
    };
  }
}

/**
 * Verify a domain (trigger verification check)
 */
export async function verifyDomain(hostname: string): Promise<{
  success: boolean;
  verified: boolean;
  verification?: VercelVerification[];
  error?: string;
}> {
  const { projectId } = getEnvVars();

  if (!projectId) {
    return { success: false, verified: false, error: "VERCEL_PROJECT_ID not configured" };
  }

  try {
    const result = await vercelFetch<VercelDomain>(
      `/v9/projects/${projectId}/domains/${hostname}/verify`,
      { method: "POST" }
    );

    return {
      success: true,
      verified: result.verified,
      verification: result.verification,
    };
  } catch (error) {
    if (error instanceof VercelAPIError) {
      return { success: false, verified: false, error: error.message };
    }
    return { success: false, verified: false, error: "Failed to verify domain" };
  }
}

/**
 * Get DNS records needed for domain verification
 */
export function getDNSInstructions(
  hostname: string,
  verification?: VercelVerification[]
): {
  cname: { host: string; value: string };
  txt?: { host: string; value: string };
} {
  // Standard CNAME record
  const cname = {
    host: hostname,
    value: "cname.vercel-dns.com",
  };

  // TXT verification record (if provided)
  const txtRecord = verification?.find((v) => v.type === "TXT");
  const txt = txtRecord
    ? {
        host: txtRecord.domain,
        value: txtRecord.value,
      }
    : undefined;

  return { cname, txt };
}

/**
 * Check if Vercel API is properly configured
 */
export function isVercelConfigured(): boolean {
  const { token, projectId } = getEnvVars();
  return Boolean(token && projectId);
}
