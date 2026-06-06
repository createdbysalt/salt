import { test, expect, type Page } from "@playwright/test";

type SaltConsentCookie = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

async function getSaltConsent(
  page: Page
): Promise<SaltConsentCookie | null> {
  const cookies = await page.context().cookies();
  const consent = cookies.find((entry) => entry.name === "salt_consent");
  if (!consent?.value) return null;

  return JSON.parse(consent.value) as SaltConsentCookie;
}

test.describe("Cookie consent", () => {
  test("shows banner on first visit with primary actions", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.getByRole("dialog", { name: "Cookie consent" });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject non-essential" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Customize" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible();
  });

  test("reject non-essential persists disabled optional categories", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Reject non-essential" }).click();

    await expect(
      page.getByRole("dialog", { name: "Cookie consent" })
    ).not.toBeVisible();

    const consent = await getSaltConsent(page);
    expect(consent).not.toBeNull();
    expect(consent?.functional).toBe(false);
    expect(consent?.analytics).toBe(false);
    expect(consent?.marketing).toBe(false);
  });

  test("accept all enables optional categories", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Accept all" }).click();

    await expect(
      page.getByRole("dialog", { name: "Cookie consent" })
    ).not.toBeVisible();

    const consent = await getSaltConsent(page);
    expect(consent).not.toBeNull();
    expect(consent?.functional).toBe(true);
    expect(consent?.analytics).toBe(true);
    expect(consent?.marketing).toBe(true);
  });

  test("cookie settings on cookie policy opens preferences after a choice is saved", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Accept all" }).click();
    await expect(
      page.getByRole("dialog", { name: "Cookie consent" })
    ).not.toBeVisible();

    await page.goto("/cookie-policy");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Cookie settings" }).click();

    const dialog = page.getByRole("dialog", { name: "Cookie consent" });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Functional")).toBeVisible();
    await expect(page.getByLabel("Analytics")).toBeVisible();
    await expect(page.getByLabel("Marketing")).toBeVisible();
  });

  test("does not restore theme from localStorage without functional consent", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(() => {
      localStorage.setItem("salt-ui-theme-v2", "dark");
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.classList.contains("light"))
      )
      .toBe(true);
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(false);

    await page.getByRole("button", { name: "Reject non-essential" }).click();

    await expect.poll(async () => page.evaluate(() => localStorage.getItem("salt-ui-theme-v2"))).toBeNull();

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.classList.contains("light"))
      )
      .toBe(true);
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(false);
  });
});
