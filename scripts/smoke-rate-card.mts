// Smoke: the playbook detail page shows the approval-rate card with the
// seeded approval + UI-recorded dismissal.
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

await page.goto(`${base}/plays/playbooks/getting-started`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(5000);

const historyCard = page.getByText(/your history with this play/i);
const visible = await historyCard
  .waitFor({ state: "visible", timeout: 10000 })
  .then(() => true)
  .catch(() => false);
console.log(
  visible
    ? "PASS: approval-rate card visible on detail page"
    : "FAIL: approval-rate card not found"
);
if (!visible) {
  console.log(
    "PAGE TEXT:",
    JSON.stringify(((await page.locator("main").innerText()) || "").slice(0, 800))
  );
}
await page.screenshot({
  path: ".screenshots/smoke-playbook-detail.png",
  fullPage: true,
});
await browser.close();
