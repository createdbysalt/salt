import { describe, expect, it } from "vitest";
import {
  CUSTOMIZE_PROMPT_CHAR_BUDGET,
  CUSTOMIZE_PROMPT_ENTRY_LIMIT,
  formatCustomizePromptBlock,
} from "./prompt-block";

describe("formatCustomizePromptBlock", () => {
  it("returns null when there are no entries", () => {
    expect(formatCustomizePromptBlock([])).toBeNull();
    expect(formatCustomizePromptBlock([{ body: "   " }])).toBeNull();
  });

  it("renders a fenced instruction block", () => {
    const block = formatCustomizePromptBlock([
      { body: "Never treat my accountant as a client" },
    ]);
    expect(block).toContain("<workspace-customizations>");
    expect(block).toContain('- "Never treat my accountant as a client"');
    expect(block).toContain("</workspace-customizations>");
  });

  it("caps the entry count", () => {
    const entries = Array.from({ length: CUSTOMIZE_PROMPT_ENTRY_LIMIT + 5 }, (_, i) => ({
      body: `Instruction ${i + 1}`,
    }));
    const block = formatCustomizePromptBlock(entries)!;
    expect(block).toContain(`Instruction ${CUSTOMIZE_PROMPT_ENTRY_LIMIT}`);
    expect(block).not.toContain(`Instruction ${CUSTOMIZE_PROMPT_ENTRY_LIMIT + 1}`);
  });

  it("caps the total character budget", () => {
    const entries = [
      { body: "x".repeat(CUSTOMIZE_PROMPT_CHAR_BUDGET - 10) },
      { body: "this entry overflows the budget" },
    ];
    const block = formatCustomizePromptBlock(entries)!;
    expect(block).not.toContain("overflows the budget");
  });
});
