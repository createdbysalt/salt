import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  normalizeBlogPlainText,
  parseBlogExcerpt,
} from "./blog-display-text";

describe("blog-display-text", () => {
  it("decodes HTML entities in copy", () => {
    expect(decodeHtmlEntities('&quot;monitor and alert&quot;')).toBe(
      '"monitor and alert"'
    );
  });

  it("normalizes excerpt markdown for plain text surfaces", () => {
    expect(
      normalizeBlogPlainText(
        '**Proactive AI** evolves from &quot;alert&quot; to &quot;act.&quot;'
      )
    ).toBe('Proactive AI evolves from "alert" to "act."');
  });

  it("parses a leading bold lead for the hero dek", () => {
    expect(
      parseBlogExcerpt(
        '**Proactive AI is evolving.** The next wave won&apos;t wait.'
      )
    ).toEqual({
      lead: "Proactive AI is evolving.",
      rest: "The next wave won't wait.",
    });
  });
});
