// Smoke pass: dismiss one queued payment-reconciliation run, approve another,
// then verify the approval-rate card on the playbook detail page responds.
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

page.on("pageerror", (err) => {
  console.log("PAGE ERROR:", String(err).slice(0, 300));
});

async function openFirstReconciliationModal() {
  await page.goto(`${base}/plays`, { waitUntil: "domcontentloaded" });
  const card = page
    .locator("article", { hasText: "Payment Reconciliation" })
    .first();
  await card.waitFor({ state: "visible", timeout: 20000 });
  // The card renders before hydration finishes; clicking too early drops the
  // event. Give React a moment, then retry the click until the modal shows.
  const modal = page.getByRole("dialog", { name: /needs a look/i });
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.waitForTimeout(1500);
    await card.getByRole("button", { name: /review/i }).first().click();
    const opened = await modal
      .waitFor({ state: "visible", timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (opened) {
      await page.waitForTimeout(500);
      return modal;
    }
  }
  throw new Error("modal never opened after 4 attempts");
}

// 1. Dismiss the newest queued run.
let modal = await openFirstReconciliationModal();
const dismissBtn = modal.getByRole("button", { name: /dismiss/i });
await dismissBtn.scrollIntoViewIfNeeded();
await dismissBtn.click();
await page.waitForTimeout(300);
// Confirm dismissal if a confirmation step appears.
const confirm = page.getByRole("button", { name: /confirm|yes, dismiss/i });
if (await confirm.isVisible().catch(() => false)) {
  await confirm.click();
}
await modal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => null);
console.log("dismissed one run");
await page.screenshot({ path: ".screenshots/smoke-after-dismiss.png" });

// 2. Approve the next queued run.
modal = await openFirstReconciliationModal();
const approveBtn = modal.getByRole("button", { name: /approve/i });
await approveBtn.scrollIntoViewIfNeeded();
await approveBtn.click();
await page.waitForTimeout(300);
const confirmApprove = page.getByRole("button", {
  name: /confirm|yes, approve/i,
});
if (await confirmApprove.isVisible().catch(() => false)) {
  await confirmApprove.click();
}
await modal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => null);
console.log("approved one run");
await page.screenshot({ path: ".screenshots/smoke-after-approve.png" });

// 3. Playbook detail page: approval-rate card.
await page.goto(`${base}/plays/playbooks/payment-reconciliation`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(4000);
const historyCard = page.getByText(/your history with this play/i);
const visible = await historyCard.isVisible().catch(() => false);
console.log(
  visible
    ? "PASS: approval-rate card visible on detail page"
    : "FAIL: approval-rate card not found"
);
await page.screenshot({ path: ".screenshots/smoke-playbook-detail.png" });

await browser.close();
