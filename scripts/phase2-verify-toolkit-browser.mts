// Phase 2 verification: the playbook authoring entry point (Create playbook)
// opens the live toolkit browser — connected apps → approved actions →
// compact argument schemas.
import { chromium } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  storageState: "e2e/fixtures/auth.json",
});
const page = await context.newPage();

await page.goto(`${base}/plays?tab=playbooks`, { waitUntil: "domcontentloaded" });

// Dismiss the cookie consent banner — it is also role="dialog".
const acceptCookies = page.getByRole("button", { name: /accept all/i });
if (await acceptCookies.isVisible().catch(() => false)) {
  await acceptCookies.click();
}

const createButton = page.getByRole("button", { name: /create playbook/i });
await createButton.click();

const dialog = page.getByRole("dialog", { name: /create playbook/i });
// The first click can land before hydration — retry only if no dialog
// appeared at all (a second click would open a stacked duplicate).
try {
  await dialog.first().waitFor({ state: "visible", timeout: 8000 });
} catch {
  await createButton.click();
  await dialog.first().waitFor({ state: "visible", timeout: 10000 });
}

// Toolkit data loads via server action — wait for a connected app accordion.
const toolkitSection = dialog.getByText(/your connected toolkit/i);
await toolkitSection.waitFor({ state: "visible", timeout: 5000 });

// Wait for loading to finish: either a toolkit appears or the empty state.
const stripeTrigger = dialog.getByText("Stripe", { exact: true });
const emptyState = dialog.getByText(/no apps connected yet/i);
await Promise.race([
  stripeTrigger.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
  emptyState.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
]);

if (await emptyState.isVisible().catch(() => false)) {
  await page.screenshot({ path: ".screenshots/phase2-toolkit-empty.png" });
  console.log("FAIL: toolkit browser shows empty state (expected Stripe connected)");
  await browser.close();
  process.exit(1);
}

if (!(await stripeTrigger.isVisible().catch(() => false))) {
  await page.screenshot({ path: ".screenshots/phase2-toolkit-missing.png" });
  console.log("FAIL: no Stripe toolkit in the browser");
  await browser.close();
  process.exit(1);
}

// Expand Stripe → actions with schemas. Rows are <li> with a risk badge
// and compact-schema chips; assert at least one row appears.
await stripeTrigger.click();
const actionRow = dialog.getByRole("listitem").first();
const hasActions = await actionRow
  .waitFor({ state: "visible", timeout: 5000 })
  .then(() => true)
  .catch(() => false);
await page.screenshot({ path: ".screenshots/phase2-toolkit-browser.png" });
console.log(
  hasActions
    ? "PASS: toolkit browser shows connected apps with actions"
    : "WARN: toolkit visible but no action rows found",
);
await browser.close();
process.exit(hasActions ? 0 : 1);
