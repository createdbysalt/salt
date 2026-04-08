/**
 * Cal.com OAuth Client
 *
 * OAuth 2.0 flow for Cal.com integration.
 * Users click "Connect" → redirected to Cal.com → authorize → redirected back with tokens.
 */

// OAuth endpoints (Cal.com Platform OAuth 2.0)
// Note: The v2 API token endpoint (api.cal.com/v2/auth/oauth2/token) returns 500 errors
// See: https://github.com/calcom/cal.com/issues/27686
// Using the app.cal.com endpoint instead which works reliably
const CALCOM_OAUTH_AUTHORIZE_URL = "https://app.cal.com/auth/oauth2/authorize";
const CALCOM_OAUTH_TOKEN_URL = "https://app.cal.com/api/auth/oauth/token";

// Environment variables
const CALCOM_CLIENT_ID = process.env.CALCOM_CLIENT_ID;
const CALCOM_CLIENT_SECRET = process.env.CALCOM_CLIENT_SECRET;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Get the OAuth callback URL for Cal.com
 */
export function getCalcomCallbackUrl(): string {
  return `${NEXT_PUBLIC_SITE_URL}/api/integrations/calcom/callback`;
}

/**
 * Generate the Cal.com OAuth authorization URL.
 *
 * @param state - CSRF protection state (should include studioId)
 */
export function getCalcomAuthorizationUrl(state: string): string {
  if (!CALCOM_CLIENT_ID) {
    throw new Error("CALCOM_CLIENT_ID environment variable is not set");
  }

  // Scopes matching what was configured in Cal.com OAuth client
  // Format: {RESOURCE}_{ACTION} (e.g., PROFILE_READ, BOOKING_WRITE)
  const scopes = [
    "PROFILE_READ",
    "BOOKING_READ",
    "SCHEDULE_READ",
    "EVENT_TYPE_READ",
    "EVENT_TYPE_WRITE",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: CALCOM_CLIENT_ID,
    redirect_uri: getCalcomCallbackUrl(),
    response_type: "code",
    scope: scopes,
    state,
  });

  return `${CALCOM_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens.
 */
export async function exchangeCalcomCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  if (!CALCOM_CLIENT_ID || !CALCOM_CLIENT_SECRET) {
    throw new Error("Cal.com OAuth credentials not configured");
  }

  const requestBody = new URLSearchParams({
    client_id: CALCOM_CLIENT_ID,
    client_secret: CALCOM_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: getCalcomCallbackUrl(),
  });

  console.log("Cal.com token exchange request:", {
    url: CALCOM_OAUTH_TOKEN_URL,
    redirect_uri: getCalcomCallbackUrl(),
  });

  const response = await fetch(CALCOM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

  const responseText = await response.text();

  console.log("Cal.com token exchange response:", {
    status: response.status,
    statusText: response.statusText,
    body: responseText.substring(0, 500),
  });

  if (!response.ok) {
    console.error("Cal.com token exchange failed:", responseText);
    throw new Error(`Failed to exchange authorization code: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

/**
 * Refresh an expired access token.
 */
export async function refreshCalcomToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  if (!CALCOM_CLIENT_ID || !CALCOM_CLIENT_SECRET) {
    throw new Error("Cal.com OAuth credentials not configured");
  }

  const response = await fetch(CALCOM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CALCOM_CLIENT_ID,
      client_secret: CALCOM_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Cal.com token refresh failed:", error);
    // Token is invalid - user needs to reconnect
    throw new Error("Cal.com session expired. Please reconnect in Settings → Integrations.");
  }

  return response.json();
}

/**
 * Fetch the Cal.com user profile using an access token.
 */
export async function getCalcomUserProfile(accessToken: string): Promise<{
  id: number;
  username: string;
  email: string;
  name: string;
}> {
  const response = await fetch("https://api.cal.com/v2/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "cal-api-version": "2024-08-13",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Cal.com user profile");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Check if Cal.com OAuth is configured.
 */
export function isCalcomOAuthConfigured(): boolean {
  return !!(CALCOM_CLIENT_ID && CALCOM_CLIENT_SECRET);
}
