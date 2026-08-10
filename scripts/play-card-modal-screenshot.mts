// Screenshot HQ play queue + Plays auto-handled cards.
import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  storageState: "e2e/fixtures/auth.json",
});
const page = await context.newPage();

// HQ Today — play queue stack
await page.goto(`${base}/hq`, { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
const accept = page.getByRole("button", { name: /accept/i });
if (await accept.isVisible().catch(() => false)) await accept.click();
const queue = page.locator("section#play-queue");
await queue.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await queue.screenshot({ path: ".screenshots/hq-play-queue.png" });

// HQ — open the detail modal from the top card
await page.locator("section#play-queue article").first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: ".screenshots/hq-play-modal.png", fullPage: false });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Plays — auto-handled tab
await page.goto(`${base}/plays?filter=auto_handled`, { waitUntil: "domcontentloaded" });

// Click fast — the page marks items seen 2s in, which empties the list.
const handledCard = page.locator("article[role='listitem']").first();
await handledCard.waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
if (await handledCard.isVisible().catch(() => false)) {
  await page.screenshot({ path: ".screenshots/plays-auto-handled.png", fullPage: false });
  await handledCard.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".screenshots/plays-handled-modal.png", fullPage: false });
  // Expand "How Salt knew"
  const evidenceToggle = page.getByRole("button", { name: /how salt knew/i });
  if (await evidenceToggle.isVisible().catch(() => false)) {
    await evidenceToggle.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".screenshots/plays-handled-modal-evidence.png", fullPage: false });
  }
} else {
  console.log("no handled cards visible — marked seen by earlier runs");
}

await browser.close();
console.log("done");
