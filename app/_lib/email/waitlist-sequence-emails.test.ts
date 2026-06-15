import { describe, expect, it } from "vitest";
import {
  WAITLIST_SEQUENCE_02_SUBJECT,
  WAITLIST_SEQUENCE_04_SUBJECT,
  WAITLIST_SEQUENCE_EMAILS,
  WAITLIST_SEQUENCE_SLUGS,
  buildWaitlistSequence02Email,
  buildWaitlistSequence04Email,
  buildWaitlistSequenceEmail,
} from "./waitlist-sequence-emails";
import { WAITLIST_EMAIL_PAGE_BG } from "./waitlist-email-layout";

describe("waitlist sequence emails", () => {
  it("builds every sequence slug with white outer background", () => {
    for (const slug of WAITLIST_SEQUENCE_SLUGS) {
      const email = buildWaitlistSequenceEmail(slug, {
        siteUrl: "http://localhost:3000",
      });

      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.html).toContain(`background-color: ${WAITLIST_EMAIL_PAGE_BG}`);
      expect(email.html).not.toContain("background-color: #f6f3ec");
      expect(email.html).toContain("Matt & Gabi");
      expect(email.text).toContain("Matt & Gabi");
    }
  });

  it("email 2 uses distinct hero copy and shared body format", () => {
    const email = buildWaitlistSequence02Email({
      siteUrl: "http://localhost:3000",
    });

    expect(email.subject).toBe(WAITLIST_SEQUENCE_02_SUBJECT);
    expect(email.html).toContain("The work no one sees");
    expect(email.html).toContain("invisible load");
    expect(email.text).toContain("You're not disorganized");
  });

  it("email 4 includes calculator CTA link", () => {
    const email = buildWaitlistSequence04Email({
      siteUrl: "https://usesalt.io",
    });

    expect(email.subject).toBe(WAITLIST_SEQUENCE_04_SUBJECT);
    expect(email.html).toContain("https://usesalt.io/money-on-the-table");
    expect(email.html).toContain("Show me the money on the table");
  });

  it("hero copy is distinct from inbox subject and preview text", () => {
    for (const slug of WAITLIST_SEQUENCE_SLUGS) {
      const { meta } = WAITLIST_SEQUENCE_EMAILS[slug];
      const email = buildWaitlistSequenceEmail(slug, {
        siteUrl: "http://localhost:3000",
      });

      expect(email.html).toContain(meta.heroHeadline);
      expect(email.html).toContain(meta.heroSubtitle);
      expect(meta.heroHeadline).not.toBe(meta.subject);
      expect(meta.heroSubtitle).not.toBe(meta.previewText);
    }
  });

  it("sequence emails 2–8 do not mention July 1 (reserved for confirmation only)", () => {
    for (const slug of WAITLIST_SEQUENCE_SLUGS) {
      const email = buildWaitlistSequenceEmail(slug, {
        siteUrl: "http://localhost:3000",
      });

      expect(email.text).not.toMatch(/July 1/i);
      expect(email.html).not.toMatch(/July 1/i);
      expect(email.text).not.toMatch(/first 30/i);
      expect(email.html).not.toMatch(/first 30/i);
    }
  });
});
