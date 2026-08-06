/**
 * Phase E screenshot pass: authenticate via a Supabase admin magic-link token
 * against the local dev server (running this branch on staging data) and
 * capture the Captures view — billing amounts, noise demotion, statuses.
 *
 * Run:
 *   op run --env-file=.env.staging.1password -- pnpm tsx scripts/screenshot-captures-view.ts
 *
 * Screenshots land in .screenshots/ (gitignored).
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE_URL = "http://localhost:3000";
const EMAIL = process.env.SCREENSHOT_USER_EMAIL ?? "hello@createdbysalt.com";
const OUT_DIR = ".screenshots";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${error?.message ?? "no token"}`);
  }
  const tokenHash = data.properties.hashed_token;
  console.log(`Magic-link token generated for ${EMAIL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  // Establish the SSR session via the app's callback route.
  await page.goto(
    `${BASE_URL}/api/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForTimeout(3000);
  console.log(`Post-auth URL: ${page.url()}`);

  // Captures view
  await page.goto(`${BASE_URL}/plays?tab=activity&view=captures`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(8000); // stream data + lazy panels
  await page.screenshot({ path: `${OUT_DIR}/captures-stream.png`, fullPage: false });
  console.log(`Saved ${OUT_DIR}/captures-stream.png`);

  // Expand the first capture row to show the detail panel, if present.
  const firstRow = page.locator('[data-slot="card"], li, article').first();
  try {
    const rows = page.getByRole("button").filter({ hasText: /invoice|payment|stripe/i });
    if ((await rows.count()) > 0) {
      await rows.first().click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT_DIR}/captures-billing-detail.png` });
      console.log(`Saved ${OUT_DIR}/captures-billing-detail.png`);
    } else if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT_DIR}/captures-first-detail.png` });
      console.log(`Saved ${OUT_DIR}/captures-first-detail.png`);
    }
  } catch {
    console.log("No expandable capture row found — stream screenshot only.");
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
