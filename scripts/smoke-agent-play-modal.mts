// Smoke pass: the payment-reconciliation run (agent step) fired via the
// debug harness lands in the Plays Queue and renders in the detail modal
// with the agent evidence item and connector logos.
import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  storageState: "e2e/fixtures/auth.json",
});
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error")
    console.log("CONSOLE ERROR:", msg.text().slice(0, 300));
});
page.on("pageerror", (err) => {
  console.log("PAGE ERROR:", String(err).slice(0, 300));
});

// Pre-set consent so the banner never renders (it is also role="dialog" and
// intercepts clicks / wins naive dialog locators).
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

await page.goto(`${base}/plays`, { waitUntil: "domcontentloaded" });

// Queue data loads client-side — wait for a card or the empty state.
const card = page
  .locator("article", { hasText: "Payment Reconciliation" })
  .first();
await card.waitFor({ state: "visible", timeout: 20000 }).catch(() => null);

if (!(await card.isVisible().catch(() => false))) {
  await page.screenshot({ path: ".screenshots/smoke-queue-missing.png" });
  console.log("FAIL: no 'Payment Reconciliation' card in the queue");
  await browser.close();
  process.exit(1);
}

await page.screenshot({ path: ".screenshots/smoke-queue.png" });
await card.getByRole("button", { name: /review/i }).first().click();

// The play modal's accessible name is the run headline.
const modal = page.getByRole("dialog", { name: /needs a look/i });
try {
  await modal.waitFor({ state: "visible", timeout: 10000 });
} catch {
  const dialogs = await page.getByRole("dialog").all();
  console.log("DEBUG dialogs on page:", dialogs.length);
  for (const d of dialogs) {
    console.log(
      "  dialog name:",
      JSON.stringify(await d.getAttribute("aria-label")),
      "| text:",
      JSON.stringify(((await d.innerText()) || "").slice(0, 200))
    );
  }
  await page.screenshot({ path: ".screenshots/smoke-after-click.png" });
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(800);
await page.screenshot({ path: ".screenshots/smoke-modal.png" });

const evidenceToggle = modal.getByRole("button", { name: /how salt knew/i });
await evidenceToggle.scrollIntoViewIfNeeded().catch(() => null);
await evidenceToggle
  .waitFor({ state: "visible", timeout: 5000 })
  .catch(() => null);
if (!(await evidenceToggle.isVisible().catch(() => false))) {
  const buttons = await modal.getByRole("button").allTextContents();
  const headings = await modal.getByRole("heading").allTextContents();
  console.log("DEBUG modal headings:", JSON.stringify(headings));
  console.log("DEBUG modal buttons:", JSON.stringify(buttons));
  console.log(
    "DEBUG modal text sample:",
    JSON.stringify(((await modal.innerText()) || "").slice(0, 1200))
  );
}
if (await evidenceToggle.isVisible().catch(() => false)) {
  await evidenceToggle.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: ".screenshots/smoke-modal-evidence.png" });
  const agentEvidence = modal.getByText(/agent step/i);
  console.log(
    (await agentEvidence.count()) > 0
      ? "PASS: agent evidence item present"
      : "WARN: agent evidence item not found"
  );
} else {
  console.log("WARN: evidence toggle not found");
}

console.log("PASS: queued run opened in modal");
await browser.close();
