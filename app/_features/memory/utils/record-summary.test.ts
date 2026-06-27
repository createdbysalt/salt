import { describe, expect, it } from "vitest";
import {
  buildPersonSummary,
  buildOrgSummary,
  buildWorkSummary,
  formatMoneyFromCents,
  pluralize,
  type PersonSummaryInput,
  type OrgSummaryInput,
  type WorkSummaryInput,
} from "./record-summary";

describe("formatMoneyFromCents", () => {
  it("formats small amounts without k suffix", () => {
    expect(formatMoneyFromCents(500_00)).toBe("$500");
    expect(formatMoneyFromCents(999_00)).toBe("$999");
  });

  it("formats $1000+ with k suffix", () => {
    expect(formatMoneyFromCents(1000_00)).toBe("$1k");
    expect(formatMoneyFromCents(1500_00)).toBe("$1.5k");
    expect(formatMoneyFromCents(10000_00)).toBe("$10k");
    expect(formatMoneyFromCents(25000_00)).toBe("$25k");
  });

  it("omits decimal when exact thousands", () => {
    expect(formatMoneyFromCents(2000_00)).toBe("$2k");
    expect(formatMoneyFromCents(5000_00)).toBe("$5k");
  });
});

describe("pluralize", () => {
  it("returns singular for count 1", () => {
    expect(pluralize(1, "project")).toBe("project");
    expect(pluralize(1, "contact")).toBe("contact");
  });

  it("returns plural for count != 1", () => {
    expect(pluralize(0, "project")).toBe("projects");
    expect(pluralize(2, "project")).toBe("projects");
    expect(pluralize(5, "contact")).toBe("contacts");
  });

  it("uses custom plural when provided", () => {
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});

describe("buildPersonSummary", () => {
  const baseInput: PersonSummaryInput = {
    name: "Matheus",
    title: null,
    relationshipType: null,
    primaryOrg: null,
    activeWork: 0,
    mrrCents: null,
    retainerLabel: null,
    outstandingCents: 0,
    meetingWithinDays: null,
  };

  describe("fallback (sparse)", () => {
    it("returns graceful fallback when no signals", () => {
      const result = buildPersonSummary(baseInput);
      expect(result).toBe(
        "Matheus is in your network. Connect work or payments to see more here."
      );
    });

    it("returns fallback when only unknown relationship", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "unknown",
      });
      expect(result).toBe(
        "Matheus is in your network. Connect work or payments to see more here."
      );
    });
  });

  describe("identity clause", () => {
    it("includes relationship type", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
      });
      expect(result).toBe("Matheus is your client.");
    });

    it("includes relationship and org", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        primaryOrg: { name: "Acme Studio" },
      });
      expect(result).toBe("Matheus is your client at Acme Studio.");
    });

    it("falls back to title when no relationship type", () => {
      const result = buildPersonSummary({
        ...baseInput,
        title: "Creative Director",
        primaryOrg: { name: "Acme Studio" },
      });
      expect(result).toBe("Matheus is Creative Director at Acme Studio.");
    });

    it("shows org connection when only org known", () => {
      const result = buildPersonSummary({
        ...baseInput,
        primaryOrg: { name: "Acme Studio" },
      });
      expect(result).toBe("Matheus is connected to Acme Studio.");
    });
  });

  describe("engagement clause", () => {
    it("shows active work count", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        activeWork: 2,
      });
      expect(result).toBe("Matheus is your client. With 2 active projects.");
    });

    it("shows singular project", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        activeWork: 1,
      });
      expect(result).toBe("Matheus is your client. With 1 active project.");
    });

    it("shows retainer label", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        retainerLabel: "Growth",
      });
      expect(result).toBe("Matheus is your client. With a Growth retainer.");
    });

    it("shows MRR when no retainer label", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        mrrCents: 2500_00,
      });
      expect(result).toBe("Matheus is your client. With $2.5k/mo recurring.");
    });

    it("shows outstanding balance", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        outstandingCents: 1200_00,
      });
      expect(result).toBe("Matheus is your client. With $1.2k outstanding.");
    });

    it("combines multiple engagement signals", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        activeWork: 2,
        retainerLabel: "Growth",
        outstandingCents: 500_00,
      });
      expect(result).toBe(
        "Matheus is your client. With 2 active projects, a Growth retainer and $500 outstanding."
      );
    });
  });

  describe("cadence clause", () => {
    it("shows meeting today", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        meetingWithinDays: 0,
      });
      expect(result).toBe("Matheus is your client. Next meeting today.");
    });

    it("shows meeting tomorrow", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        meetingWithinDays: 1,
      });
      expect(result).toBe("Matheus is your client. Next meeting tomorrow.");
    });

    it("shows meeting in N days", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        meetingWithinDays: 3,
      });
      expect(result).toBe("Matheus is your client. Next meeting in 3 days.");
    });

    it("excludes negative meeting days", () => {
      const result = buildPersonSummary({
        ...baseInput,
        relationshipType: "client",
        meetingWithinDays: -1,
      });
      expect(result).toBe("Matheus is your client.");
    });
  });

  describe("rich (all signals)", () => {
    it("composes complete summary", () => {
      const result = buildPersonSummary({
        name: "Matheus",
        title: "CEO",
        relationshipType: "client",
        primaryOrg: { name: "Acme Studio" },
        activeWork: 2,
        mrrCents: null,
        retainerLabel: "Growth",
        outstandingCents: 0,
        meetingWithinDays: 3,
      });
      expect(result).toBe(
        "Matheus is your client at Acme Studio. With 2 active projects and a Growth retainer. Next meeting in 3 days."
      );
    });
  });
});

describe("buildOrgSummary", () => {
  const baseInput: OrgSummaryInput = {
    name: "Acme Corp",
    relationshipStatus: null,
    industry: null,
    contactCount: 0,
    activeWork: 0,
    mrrCents: null,
    outstandingCents: 0,
  };

  describe("fallback (sparse)", () => {
    it("returns graceful fallback when no signals", () => {
      const result = buildOrgSummary(baseInput);
      expect(result).toBe(
        "Acme Corp is in your network. Add contacts or work to see more here."
      );
    });
  });

  describe("identity clause", () => {
    it("includes relationship status", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
      });
      expect(result).toBe("Acme Corp is an active client.");
    });

    it("includes industry", () => {
      const result = buildOrgSummary({
        ...baseInput,
        industry: "Technology",
      });
      expect(result).toBe("Acme Corp operates in Technology.");
    });

    it("combines relationship and industry", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "prospect",
        industry: "Healthcare",
      });
      expect(result).toBe("Acme Corp is a prospect in Healthcare.");
    });
  });

  describe("footprint clause", () => {
    it("shows contact count", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        contactCount: 5,
      });
      expect(result).toBe("Acme Corp is an active client. 5 contacts.");
    });

    it("shows singular contact", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        contactCount: 1,
      });
      expect(result).toBe("Acme Corp is an active client. 1 contact.");
    });

    it("shows active work", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        activeWork: 3,
      });
      expect(result).toBe("Acme Corp is an active client. 3 active projects.");
    });

    it("combines contacts and work", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        contactCount: 2,
        activeWork: 1,
      });
      expect(result).toBe(
        "Acme Corp is an active client. 2 contacts and 1 active project."
      );
    });
  });

  describe("money clause", () => {
    it("shows MRR", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        mrrCents: 5000_00,
      });
      expect(result).toBe("Acme Corp is an active client. $5k/mo recurring.");
    });

    it("shows outstanding", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        outstandingCents: 2500_00,
      });
      expect(result).toBe("Acme Corp is an active client. $2.5k outstanding.");
    });

    it("combines MRR and outstanding", () => {
      const result = buildOrgSummary({
        ...baseInput,
        relationshipStatus: "active_client",
        mrrCents: 3000_00,
        outstandingCents: 1000_00,
      });
      expect(result).toBe("Acme Corp is an active client. $3k/mo recurring, $1k outstanding.");
    });
  });

  describe("rich (all signals)", () => {
    it("composes complete summary", () => {
      const result = buildOrgSummary({
        name: "Acme Corp",
        relationshipStatus: "active_client",
        industry: "Technology",
        contactCount: 3,
        activeWork: 2,
        mrrCents: 5000_00,
        outstandingCents: 0,
      });
      expect(result).toBe(
        "Acme Corp is an active client in Technology. 3 contacts and 2 active projects. $5k/mo recurring."
      );
    });
  });
});

describe("buildWorkSummary", () => {
  const baseInput: WorkSummaryInput = {
    title: "Website Redesign",
    status: "active",
    org: null,
    progress: 0,
    overdue: false,
    deadline: null,
    healthBand: null,
  };

  describe("fallback (sparse)", () => {
    it("returns graceful fallback when minimal signals", () => {
      const result = buildWorkSummary(baseInput);
      expect(result).toBe(
        "Website Redesign is tracked. Add a deadline or status to see more here."
      );
    });
  });

  describe("identity clause", () => {
    it("includes status and org", () => {
      const result = buildWorkSummary({
        ...baseInput,
        status: "signed",
        org: { name: "Acme Corp" },
      });
      expect(result).toBe("Website Redesign is signed with Acme Corp.");
    });

    it("shows non-active status without org", () => {
      const result = buildWorkSummary({
        ...baseInput,
        status: "paused",
      });
      expect(result).toBe("Website Redesign is paused.");
    });

    it("shows lead status", () => {
      const result = buildWorkSummary({
        ...baseInput,
        status: "lead",
        org: { name: "Acme Corp" },
      });
      expect(result).toBe("Website Redesign is a lead with Acme Corp.");
    });
  });

  describe("progress clause", () => {
    it("shows progress percentage", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        progress: 45,
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. 45% complete.");
    });

    it("shows 100% as complete", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        progress: 100,
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. Complete.");
    });

    it("shows overdue status", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        overdue: true,
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. overdue.");
    });

    it("combines progress and overdue", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        progress: 80,
        overdue: true,
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. 80% complete, overdue.");
    });
  });

  describe("health clause", () => {
    it("shows healthy band", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        healthBand: "healthy",
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. Health is good.");
    });

    it("shows watch band", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        healthBand: "watch",
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. Needs attention.");
    });

    it("shows risk band", () => {
      const result = buildWorkSummary({
        ...baseInput,
        org: { name: "Acme Corp" },
        healthBand: "risk",
      });
      expect(result).toBe("Website Redesign is active with Acme Corp. At risk.");
    });
  });

  describe("rich (all signals)", () => {
    it("composes complete summary", () => {
      const result = buildWorkSummary({
        title: "Website Redesign",
        status: "active",
        org: { name: "Acme Corp" },
        progress: 65,
        overdue: false,
        deadline: null,
        healthBand: "healthy",
      });
      expect(result).toBe(
        "Website Redesign is active with Acme Corp. 65% complete. Health is good."
      );
    });

    it("shows risk with progress and overdue", () => {
      const result = buildWorkSummary({
        title: "Website Redesign",
        status: "active",
        org: { name: "Acme Corp" },
        progress: 40,
        overdue: true,
        deadline: null,
        healthBand: "risk",
      });
      expect(result).toBe(
        "Website Redesign is active with Acme Corp. 40% complete, overdue. At risk."
      );
    });
  });
});
