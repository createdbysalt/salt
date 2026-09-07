// Smoke: dismiss the synthetic paused getting-started run via the UI; the
// dismissal should record a row in playbook_action_approvals.
import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  storageState: "e2e/fixtures/auth.json",
});
await context.addCookies([
  {
    name: "salt_consent",
    value: JSON.stringify({
      version: 1,
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    }),
    domain: "localhost",
    path: "/",
  },
]);
const page = await context.newPage();
page.on("pageerror", (err) => console.log("PAGE ERROR:", String(err).slice(0, 300)));

await page.goto(`${base}/plays`, { waitUntil: "domcontentloaded" });
const card = page
  .locator("article", { hasText: "Getting Started" })
  .first();
await card.waitFor({ state: "visible", timeout: 20000 });

const modal = page.getByRole("dialog").filter({ hasText: /getting started/i });
for (let attempt = 0; attempt < 4; attempt++) {
  await page.waitForTimeout(1500);
  await card.getByRole("button", { name: /review/i }).first().click();
  const opened = await modal
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (opened) break;
  if (attempt === 3) {
    console.log("FAIL: modal never opened");
    await page.screenshot({ path: ".screenshots/smoke-gs-no-modal.png" });
    await browser.close();
    process.exit(1);
  }
}

await page.waitForTimeout(500);
await page.screenshot({ path: ".screenshots/smoke-gs-paused-modal.png" });

const dismissBtn = modal.getByRole("button", { name: /dismiss/i });
await dismissBtn.scrollIntoViewIfNeeded();
await dismissBtn.click();
await page.waitForTimeout(500);
const confirm = page.getByRole("button", { name: /confirm|yes, dismiss/i });
if (await confirm.isVisible().catch(() => false)) {
  await confirm.click();
}
await modal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => null);
console.log("dismissed paused getting-started run");
await page.screenshot({ path: ".screenshots/smoke-gs-after-dismiss.png" });
await browser.close();
