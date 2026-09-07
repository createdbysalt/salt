#!/usr/bin/env npx tsx
/** Smoke test: new playbook packages render in the Playbooks library and detail pages. */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const SHOTS = ".screenshots";

const EXPECTED = [
  "Invoice Reminder",
  "Cash Forecast",
  "Contract Review",
  "Weekly Briefing",
  "Lead Follow-Up",
  "Customer Pulse",
  "Complaint Response",
];

const DETAIL_CHECKS: Record<string, string[]> = {
  "contract-review": ["What it does", "Runs on its own"],
  "weekly-briefing": ["What it does"],
  "lead-follow-up": ["Asks you first"],
  "customer-pulse": ["What it does"],
  "complaint-response": ["Asks you first"],
  "cash-runway": ["What it does"],
};

const failures: string[] = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Dev login
  await page.goto(`${BASE}/dev-login`);
  await page.waitForLoadState("networkidle");
  await page.getByText("Studio User").first().click();
  await page.waitForURL("**/hq**", { timeout: 15000 });

  // Playbooks library
  await page.goto(`${BASE}/plays?tab=playbooks`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/playbooks-library.png`, fullPage: true });
  const library = await page.content();
  for (const name of EXPECTED) {
    if (!library.includes(name)) failures.push(`library missing card: ${name}`);
  }

  // Detail pages
  for (const [slug, needles] of Object.entries(DETAIL_CHECKS)) {
    await page.goto(`${BASE}/plays/playbooks/${slug}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const body = await page.content();
    if (body.toLowerCase().includes("this page could not be found")) {
      failures.push(`detail 404: ${slug}`);
      continue;
    }
    for (const needle of needles) {
      if (!body.includes(needle)) failures.push(`detail ${slug} missing: ${needle}`);
    }
    await page.screenshot({ path: `${SHOTS}/playbook-${slug}.png`, fullPage: true });
  }

  await browser.close();

  if (failures.length > 0) {
    console.log("FAILURES:");
    for (const f of failures) console.log(" -", f);
    process.exit(1);
  }
  console.log("OK: all playbook cards and detail pages render");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
