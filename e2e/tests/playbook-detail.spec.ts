import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Playbook detail page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, "/plays/playbooks/invoice-reminder");
  });

  test("renders hero and the four tabs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    await expect(page.getByRole("tab")).toHaveText([
      "Overview",
      "Customize",
      "Advanced",
      "Activity",
    ]);

    await expect(page.getByRole("button", { name: "Run playbook" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit playbook" })).toBeVisible();
  });

  test("Overview shows what/when/needs sections", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    await expect(page.getByText("What it does")).toBeVisible();
    await expect(page.getByText("When it runs")).toBeVisible();
    await expect(page.getByText("What it needs")).toBeVisible();
  });

  test("Overview lists all six invoice-reminder steps", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    await expect(
      page.getByText("Pulls invoice context from Memory")
    ).toBeVisible();
    await expect(
      page.getByText("Verifies with your connected apps before acting")
    ).toBeVisible();
    await expect(page.getByText("Decides whether to proceed")).toBeVisible();
    await expect(page.getByText(/Sorts the results/)).toBeVisible();
    await expect(
      page.getByText("Writes the draft for you to review")
    ).toBeVisible();
    await expect(
      page.getByText(/Sends the reminder from (Gmail|Outlook)/)
    ).toBeVisible();
  });

  test("What it needs can add and remove a connected app", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    const addBilling = page.getByRole("combobox", { name: "Add billing app" });
    if ((await addBilling.count()) > 0) {
      await addBilling.click();
      const firstApp = page.getByRole("option").first();
      const appName = (await firstApp.innerText()).trim();
      await firstApp.click();

      const remove = page.getByRole("button", {
        name: new RegExp(`Remove ${appName}`, "i"),
      });
      await expect(remove).toBeVisible({ timeout: 15000 });
      await remove.click();
      await expect(remove).toBeHidden({ timeout: 15000 });
      return;
    }

    // Backfilled workspaces already have every connected billing app selected.
    const existing = page.getByRole("button", { name: /^Remove / }).first();
    if ((await existing.count()) > 0) {
      const label = (await existing.getAttribute("aria-label")) ?? "";
      const appName = label.replace(/^Remove /i, "").trim();
      await existing.click();
      await expect(
        page.getByRole("button", { name: label })
      ).toBeHidden({ timeout: 15000 });

      const add = page.getByRole("combobox", { name: /Add .+ app/i }).first();
      await expect(add).toBeVisible({ timeout: 15000 });
      await add.click();
      await page.getByRole("option", { name: new RegExp(appName, "i") }).click();
      await expect(
        page.getByRole("button", { name: new RegExp(`Remove ${appName}`, "i") })
      ).toBeVisible({ timeout: 15000 });
      return;
    }

    await expect(
      page.getByText(/no apps added|no app connected yet/i).first()
    ).toBeVisible();
  });

  test("tabs switch panels", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    await page.getByRole("tab", { name: "Activity" }).click();
    await expect(
      page.getByRole("tab", { name: "Activity" })
    ).toHaveAttribute("data-state", "active");

    await page.getByRole("tab", { name: "Customize" }).click();
    await expect(
      page.getByRole("tab", { name: "Customize" })
    ).toHaveAttribute("data-state", "active");

    await page.getByRole("button", { name: "Edit playbook" }).click();
    await expect(
      page.getByRole("tab", { name: "Overview" })
    ).toHaveAttribute("data-state", "active");

    await page.getByRole("tab", { name: "Advanced" }).click();
    await expect(page.getByText(/development only/i)).toBeVisible();
  });

  test("record-condition trigger picker forks, renders, and resets", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /invoice reminder/i })
    ).toBeVisible({ timeout: 30000 });

    // Switch the trigger kind to a record condition (fork-on-edit).
    await page.getByRole("combobox", { name: "Trigger kind" }).click();
    await page
      .getByRole("option", { name: /when a record matches a condition/i })
      .click();

    // Fork banner appears and the condition picker renders.
    await expect(
      page.getByText(/customized from salt's default/i)
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("combobox", { name: "Record type" })
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Field" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Operator" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /test against the last 30 days/i })
    ).toBeVisible();

    // Restore the Salt default so the workspace is left clean.
    await page
      .getByRole("button", { name: /reset to default/i })
      .click();
    await expect(
      page.getByText(/customized from salt's default/i)
    ).toBeHidden({ timeout: 15000 });
  });
});
