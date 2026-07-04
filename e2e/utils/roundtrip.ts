import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Round-trip persistence helpers for Memory detail pages.
 *
 * Locator strategy (role-based ONLY, per e2e/CLAUDE.md):
 * The inline field editors (`AccountFieldEditors.tsx`) render a <button> whose
 * accessible name is the CURRENT VALUE of the field (or its placeholder when
 * empty). There is no label→control association, so the only deterministic
 * role-based handle is "button named <placeholder | any vocabulary label>".
 *
 * - Text fields on freshly created blank records show their placeholder
 *   ("Add email", "Add number", …), which is unique per row.
 * - InlineSelect triggers always show either the placeholder or one of the
 *   vocabulary option labels, so a regex over that closed set finds the
 *   trigger regardless of current state.
 *
 * ACCESSIBILITY FINDING (do not fix here — app code is off-limits for these
 * specs): none of the inline editors expose the field label ("Email",
 * "Status", …) in their accessible name. A screen reader announces the raw
 * value ("Add email", "Draft") with no field context, and tests cannot use
 * getByLabel. The dt/dd rows should associate label and control
 * (aria-labelledby on the button pointing at the <dt> id).
 */

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex matching a button whose accessible name is exactly one of the given strings. */
export function nameOneOf(...alternatives: string[]): RegExp {
  return new RegExp(`^(${alternatives.map(escapeRegex).join("|")})$`);
}

/**
 * The inline editors keep their optimistic local value and only `toast.error`
 * when the server action fails — the exact silent-no-op failure mode this
 * suite exists to catch. Surface any error toast as a hard test failure with
 * the server's message.
 */
export async function failOnErrorToast(page: Page): Promise<void> {
  const toast = page
    .getByRole("status")
    .filter({ hasText: /failed|could not|error|invalid|unable|denied|not found|must be|unauthorized/i });
  try {
    // Server actions can take a few seconds to come back with an error; sonner
    // shows the toast for ~4s, so a 5s watch window catches late failures.
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
  } catch {
    return; // no error toast — the edit reached the server cleanly
  }
  const message = (await toast.first().innerText()).trim().replace(/\s+/g, " ");
  throw new Error(`Inline editor raised an error toast: ${message}`);
}

/**
 * page.reload with one retry — the turbopack dev server occasionally drops a
 * connection (net::ERR_EMPTY_RESPONSE) under back-to-back spec load.
 */
export async function reloadWithRetry(page: Page): Promise<void> {
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch {
    await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  }
}

/**
 * Click an inline-edit button and replace its content.
 * The editing <input> autofocuses (and has no accessible name — see the
 * accessibility finding above), so we drive it through the keyboard.
 */
export async function editInlineText(
  page: Page,
  scope: Locator,
  buttonName: RegExp | string,
  newValue: string,
): Promise<void> {
  const button = scope.getByRole("button", { name: buttonName }).first();
  await expect(button).toBeVisible({ timeout: 15_000 });
  await button.click();
  await page.keyboard.press("ControlOrMeta+a");
  if (newValue === "") {
    await page.keyboard.press("Backspace");
  } else {
    await page.keyboard.type(newValue);
  }
  await page.keyboard.press("Enter");
  if (newValue !== "") {
    await expect(
      scope.getByRole("button", { name: newValue, exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  }
  await failOnErrorToast(page);
}

/**
 * Open an InlineSelect (trigger button → Radix popover, role=dialog) and pick
 * an option. Retries the trigger click once: the trigger renders a static
 * fallback until hydration (RadixAfterHydration), and a too-early click is a
 * silent no-op.
 */
export async function pickInlineSelect(
  page: Page,
  scope: Locator,
  triggerName: RegExp,
  optionLabel: string,
): Promise<void> {
  const trigger = scope.getByRole("button", { name: triggerName }).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });

  const option = page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: optionLabel, exact: true });

  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    try {
      await expect(option).toBeVisible({ timeout: 3_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error(`InlineSelect popover never opened for ${triggerName}`);
    }
  }

  await option.click();
  await expect(
    scope.getByRole("button", { name: optionLabel, exact: true }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await failOnErrorToast(page);
}

/**
 * Set an InlineDatePicker by double-clicking into its typing mode.
 * The editing input is the ONLY inline editor with an aria-label ("Date").
 */
export async function editInlineDate(
  page: Page,
  scope: Locator,
  buttonName: RegExp | string,
  isoDate: string,
): Promise<void> {
  const button = scope.getByRole("button", { name: buttonName }).first();
  await expect(button).toBeVisible({ timeout: 15_000 });
  await button.dblclick();
  // Double-click may have opened the calendar popover first; the typing input
  // replaces the trigger either way.
  const input = page.getByLabel("Date");
  await expect(input).toBeVisible({ timeout: 5_000 });
  await input.fill(isoDate);
  await input.press("Enter");
  await failOnErrorToast(page);
}

/**
 * Click a directory "Add <record>" button and wait for navigation to the new
 * blank record. Retries: the button is a client transition (MemoryListAddButton)
 * and a click before hydration is a silent no-op.
 */
export async function createBlankRecord(
  page: Page,
  buttonName: RegExp,
  urlPattern: RegExp,
): Promise<void> {
  const button = page.getByRole("button", { name: buttonName });
  await expect(button).toBeVisible({ timeout: 30_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await button.click();
    try {
      await page.waitForURL(urlPattern, { timeout: 20_000 });
      return;
    } catch {
      await failOnErrorToast(page); // surface a creation error if the action failed
    }
  }
  throw new Error(`Blank record creation never navigated (${buttonName})`);
}

/** The active Radix tab panel — scopes field lookups away from hero/sidebar. */
export function overviewPanel(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** Switch a Memory detail page to its Activity tab. */
export async function openActivityTab(page: Page): Promise<void> {
  const tab = page.getByRole("tab", { name: /activity/i });
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
}

/** Format an ISO yyyy-mm-dd date the way InlineDatePicker displays it (e.g. "Aug 1, 2026"). */
export function displayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
