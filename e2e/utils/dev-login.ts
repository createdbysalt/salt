import type { APIRequestContext } from "@playwright/test";

const DEFAULT_EMAIL = "test-studio@saltcore.dev";
const DEFAULT_PASSWORD = "teststudio123";

type DevLoginOptions = {
  email?: string;
  password?: string;
  maxAttempts?: number;
};

/** Dev-login can fail on cold start (route compile + Supabase handshake). Retry with backoff. */
export async function devLoginWithRetry(
  request: APIRequestContext,
  baseURL: string,
  options: DevLoginOptions = {},
): Promise<void> {
  const email = options.email ?? DEFAULT_EMAIL;
  const password = options.password ?? DEFAULT_PASSWORD;
  const maxAttempts = options.maxAttempts ?? 5;

  let lastError = "unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request.post(`${baseURL}/api/auth/dev-login`, {
        data: { email, password },
        timeout: 180_000,
      });

      if (response.ok()) {
        return;
      }

      lastError = await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < maxAttempts) {
      const delayMs = attempt * 3_000;
      console.log(
        `⚠️ Dev login attempt ${attempt}/${maxAttempts} failed (${lastError}), retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("❌ Dev login failed:", lastError);
  console.log("💡 Make sure ENABLE_DEV_LOGIN=true is set and test users are seeded");
  console.log("   Run: pnpm dlx tsx scripts/seed-test-users.ts");
  throw new Error(`Dev login failed after ${maxAttempts} attempts: ${lastError}`);
}
