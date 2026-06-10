/**
 * Mock content gating — disabled. Memory and related surfaces use real data or empty states.
 *
 * Helpers remain for legacy imports; resolution always returns false.
 */

const DEFAULT_MOCK_CONTENT_EMAIL = "test-studio@saltcore.dev";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getMockContentAccountEmail(): string {
  return normalizeEmail(
    process.env.NEXT_PUBLIC_MOCK_CONTENT_EMAIL ?? DEFAULT_MOCK_CONTENT_EMAIL,
  );
}

export function getMockContentStudioId(): string | null {
  const id = process.env.MOCK_CONTENT_STUDIO_ID?.trim();
  return id || null;
}

export function isMockContentAccountEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return normalizeEmail(email) === getMockContentAccountEmail();
}

export function isMockContentStudioId(
  studioId: string | null | undefined,
): boolean {
  const configured = getMockContentStudioId();
  if (!configured || !studioId) return false;
  return studioId === configured;
}

export function resolveMockContentEnabled(_input: {
  email?: string | null;
  studioId?: string | null;
}): boolean {
  return false;
}

/** Pick mock fixtures or an empty fallback for the current account. */
export function demoOrEmpty<T>(enabled: boolean, mockData: T, empty: T): T {
  return enabled ? mockData : empty;
}
