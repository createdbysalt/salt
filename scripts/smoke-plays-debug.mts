// Debug: load /plays and capture console errors + failed requests.
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

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text().slice(0, 300));
});
page.on("response", (res) => {
  if (res.status() >= 400) console.log("HTTP", res.status(), res.url().slice(0, 160));
});

await page.goto(`${base}/plays`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
await page.screenshot({ path: ".screenshots/smoke-plays-debug.png" });

const bodyText = (await page.locator("main").innerText().catch(() => "")) || "";
console.log("MAIN TEXT:", JSON.stringify(bodyText.slice(0, 600)));

await browser.close();
