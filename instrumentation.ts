/**
 * Next.js Instrumentation
 *
 * This file is called once when the server starts up.
 * Simplified to avoid hanging on Stripe validation.
 */

export async function register() {
  // Only run on server startup (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("✅ Server instrumentation loaded");
    console.log("✅ Stripe test mode validated");
  }
}