import { test, expect } from "@playwright/test";

test.describe("blog", () => {
  test("article page shows Webflow-style editorial layout", async ({ page }) => {
    await page.goto("/blog/what-is-proactive-ai");
    await page.waitForLoadState("networkidle");

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "Blog" })).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: "Proactive AI" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /What Is Proactive AI\? The Complete Guide/i,
      })
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Matt Martins" })).toBeVisible();

    await expect(page.getByRole("navigation", { name: "Table of contents" })).toBeVisible();
    await expect(page.getByText("Share")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Unlock exclusive Salt content/i })
    ).toBeVisible();
    await expect(page.getByLabel("Business email")).toBeVisible();

    await expect(
      page.getByRole("complementary", {
        name: /Explore What Is Proactive AI/i,
      }).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "ChatGPT" }).first()).toBeVisible();
    await expect(page.getByText("Explore this content with AI:").first()).toBeVisible();

    await expect(page.getByText("Last updated")).toBeVisible();

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain("BlogPosting");
    expect(jsonLd).toContain("BreadcrumbList");
  });

  test("article page is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/blog/what-is-proactive-ai");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /What Is Proactive AI\? The Complete Guide/i,
      })
    ).toBeVisible();

    await expect(page.getByText("Explore this content with AI:").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ChatGPT" }).first()).toBeVisible();

    await expect(
      page.locator('details[aria-label="Table of contents"]')
    ).toBeVisible();
  });

  test("serves machine-readable markdown at /blog/:slug.md", async ({
    request,
  }) => {
    const response = await request.get("/blog/what-is-proactive-ai.md");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");

    const body = await response.text();
    expect(body).toContain("# What Is Proactive AI");
    expect(body).toContain("## Key takeaways");
  });

  test("serves extended blog catalog at /llms-full", async ({ request }) => {
    const response = await request.get("/llms-full");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("# Salt Blog — Full Catalog");
    expect(body).toContain("what-is-proactive-ai");
  });

  test("redirects legacy /learn routes to /blog", async ({ page }) => {
    await page.goto("/learn/what-is-proactive-ai");
    await expect(page).toHaveURL(/\/blog\/what-is-proactive-ai/);

    await page.goto("/learn/category/proactive-ai");
    await expect(page).toHaveURL(/\/blog\/category\/proactive-ai/);

    await page.goto("/learn");
    await expect(page).toHaveURL(/\/blog$/);
  });

  test("hub search navigates to dedicated search page with results", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.getByLabel("Search blog articles").fill("proactive");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/blog\/search\?q=proactive/);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      "Search"
    );
    await expect(
      page.getByRole("heading", { level: 3, name: /What Is Proactive AI/i })
    ).toBeVisible();
  });
});
