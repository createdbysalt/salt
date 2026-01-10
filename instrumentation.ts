/**
 * Next.js Instrumentation
 *
 * This file is called once when the server starts up.
 * Use it for initialization tasks like validating environment variables.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server startup (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateStripeTestMode } = await import("@/libs/stripe-test-guards");
    validateStripeTestMode();
  }
}
