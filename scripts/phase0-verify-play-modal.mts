// Phase 0 verification: the payment-received play run fired via the manual
// dispatch harness lands in the Plays Queue and opens in the detail modal.
import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  storageState: "e2e/fixtures/auth.json",
});
const page = await context.newPage();

await page.goto(`${base}/plays`, { waitUntil: "domcontentloaded" });

// Dismiss the cookie consent banner — it is also role="dialog" and would
// otherwise win a naive dialog locator.
const acceptCookies = page.getByRole("button", { name: /accept all/i });
if (await acceptCookies.isVisible().catch(() => false)) {
  await acceptCookies.click();
}

// Queue → Needs You is the default; find the fired run's card.
const card = page.locator("article", { hasText: "Payment Received" }).first();
await card.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);

if (!(await card.isVisible().catch(() => false))) {
  await page.screenshot({ path: ".screenshots/phase0-queue-missing.png" });
  console.log("FAIL: no 'Payment Received' card in the queue");
  await browser.close();
  process.exit(1);
}

await page.screenshot({ path: ".screenshots/phase0-queue.png" });
await card.click();

// The play modal's accessible name is the run headline.
const modal = page.getByRole("dialog", { name: /draft is ready/i });
await modal.waitFor({ state: "visible", timeout: 10000 });
await page.waitForTimeout(800);
await page.screenshot({ path: ".screenshots/phase0-modal.png" });

// Expand "How Salt knew" — the evidence timeline.
const evidenceToggle = modal.getByRole("button", { name: /how salt knew/i });
await evidenceToggle.waitFor({ state: "visible", timeout: 5000 }).catch(() => null);
if (await evidenceToggle.isVisible().catch(() => false)) {
  await evidenceToggle.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: ".screenshots/phase0-modal-evidence.png" });
} else {
  console.log("WARN: evidence toggle not found");
  await browser.close();
  process.exit(1);
}

console.log("PASS: queued run opened in modal with evidence timeline");
await browser.close();
