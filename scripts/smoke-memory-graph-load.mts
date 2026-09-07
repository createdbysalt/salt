/**
 * Visual smoke: /memory graph camera on initial load.
 *
 * Captures frames at fixed offsets after navigation to verify the graph
 * never paints a zoomed-in default camera before settling (the camera now
 * tracks the layout bloom frame-by-frame until the engine cools).
 *
 * Requires the dev server on :3000. Screenshots land in .screenshots/.
 *
 *   pnpm tsx scripts/smoke-memory-graph-load.mts
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".screenshots/memory-graph-load";
const OFFSETS_MS = [150, 400, 800, 1500, 2500, 5000];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const login = await context.request.post(`${BASE}/api/auth/dev-login`, {
    data: { email: "test-studio@saltcore.dev", password: "teststudio123" },
    timeout: 180_000,
  });
  if (!login.ok()) {
    throw new Error(`dev-login failed: ${login.status()} ${await login.text()}`);
  }

  const page = await context.newPage();

  // Warm pass: prime the chunk/route caches so the second navigation
  // reproduces a real warm load (instant mount — where the flash showed).
  await page.goto(`${BASE}/memory`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const start = Date.now();
  await page.goto(`${BASE}/memory`, { waitUntil: "domcontentloaded" });

  for (const offset of OFFSETS_MS) {
    const wait = offset - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    const file = `${OUT}/t+${offset}ms.png`;
    await page.screenshot({ path: file });
    console.log(`captured ${file}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
