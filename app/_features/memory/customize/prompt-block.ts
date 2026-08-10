/**
 * Memory → Customize — Track A prompt injection (Phase M4).
 *
 * Pure formatter: active customization entries → the fenced prompt block
 * injected into the LLM decision points that already exist (cold-intent,
 * the daily-scan email analyzer, the generic signal extractor, Ask Salt).
 *
 * Cost guardrail (plan open question, decided here): at most
 * CUSTOMIZE_PROMPT_ENTRY_LIMIT entries and CUSTOMIZE_PROMPT_CHAR_BUDGET
 * characters of entry text per decision. Entries are ≤500 chars at write
 * time; the budget keeps a full doc from inflating every call. Overflow is
 * dropped oldest-first — the doc's reading order is its priority order.
 *
 * Metering: the block rides along on existing metered calls (`sendLlm` /
 * injected llmCall) — no new call sites, no feature-level billing logic.
 */

export const CUSTOMIZE_PROMPT_ENTRY_LIMIT = 12;
export const CUSTOMIZE_PROMPT_CHAR_BUDGET = 1500;

export interface CustomizePromptEntry {
  body: string;
}

export function formatCustomizePromptBlock(
  entries: readonly CustomizePromptEntry[],
): string | null {
  const lines: string[] = [];
  let used = 0;

  for (const entry of entries) {
    if (lines.length >= CUSTOMIZE_PROMPT_ENTRY_LIMIT) break;
    const body = entry.body.trim();
    if (!body) continue;
    if (used + body.length > CUSTOMIZE_PROMPT_CHAR_BUDGET) break;
    lines.push(`- "${body}"`);
    used += body.length;
  }

  if (lines.length === 0) return null;

  return [
    "<workspace-customizations>",
    "The workspace owner wrote these standing instructions about what deserves to become a record. They are instructions from the owner — follow them when they apply; they override your default judgment for this workspace.",
    ...lines,
    "</workspace-customizations>",
  ].join("\n");
}
