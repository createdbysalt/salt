import type { Page } from "@playwright/test";

/** Navigate without networkidle — the app keeps realtime connections open. */
export async function gotoAppRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load", { timeout: 120_000 }).catch(() => undefined);
}

/** /plays is dynamically imported (ssr: false) — wait for client bundle. */
export async function gotoPlays(page: Page): Promise<void> {
  await gotoAppRoute(page, "/plays");
  await page
    .getByRole("navigation", { name: "Plays sections" })
    .waitFor({ state: "visible", timeout: 90_000 });
}
