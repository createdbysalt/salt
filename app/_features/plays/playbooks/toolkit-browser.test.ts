import { describe, it, expect } from "vitest";
import {
  groupToolkitBrowserRows,
  type ToolkitBrowserRow,
} from "./toolkit-browser";

const TOOLKITS = [
  {
    providerKey: "stripe",
    toolkitSlug: "stripe",
    catalogId: "stripe",
    label: "Stripe",
  },
  {
    providerKey: "gmail",
    toolkitSlug: "gmail",
    catalogId: "gmail",
    label: "Gmail",
  },
];

function row(overrides: Partial<ToolkitBrowserRow>): ToolkitBrowserRow {
  return {
    toolkitSlug: "stripe",
    toolSlug: "STRIPE_LIST_CHARGES",
    name: "List charges",
    description: null,
    inputSchema: null,
    risk: "read",
    modelProposal: null,
    ...overrides,
  };
}

describe("groupToolkitBrowserRows", () => {
  it("groups approved tools under their connected toolkit", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({ toolSlug: "STRIPE_LIST_CHARGES", name: "List charges" }),
      row({ toolSlug: "STRIPE_CREATE_INVOICE", name: "Create invoice", risk: "write" }),
      row({ toolkitSlug: "gmail", toolSlug: "GMAIL_SEND_EMAIL", name: "Send email", risk: "write" }),
    ]);

    expect(result).toHaveLength(2);
    const stripe = result.find((t) => t.toolkitSlug === "stripe");
    const gmail = result.find((t) => t.toolkitSlug === "gmail");
    expect(stripe?.tools.map((t) => t.slug)).toEqual([
      "STRIPE_LIST_CHARGES",
      "STRIPE_CREATE_INVOICE",
    ]);
    expect(gmail?.tools).toHaveLength(1);
  });

  it("drops destructive and unclassified tools", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({ toolSlug: "STRIPE_DELETE_ALL", risk: "destructive" }),
      row({ toolSlug: "STRIPE_UNREVIEWED", risk: null }),
      row({ toolSlug: "STRIPE_LIST_CHARGES" }),
    ]);

    expect(result[0]?.tools.map((t) => t.slug)).toEqual(["STRIPE_LIST_CHARGES"]);
  });

  it("prefers the classification summary over the raw description", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({
        modelProposal: { summary: "Lists recent payments." },
        description: "Technical API docs here.",
      }),
    ]);
    expect(result[0]?.tools[0]?.summary).toBe("Lists recent payments.");
  });

  it("falls back to the first sentence of the raw description", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({ description: "Lists charges. See Stripe docs for more." }),
    ]);
    expect(result[0]?.tools[0]?.summary).toBe("Lists charges.");
  });

  it("compacts input schemas for display", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({
        inputSchema: {
          type: "object",
          properties: { limit: { type: "integer", description: "Max results" } },
          required: ["limit"],
        },
      }),
    ]);
    expect(result[0]?.tools[0]?.inputSchema).toEqual({
      limit: { type: "integer", required: true, description: "Max results" },
    });
  });

  it("omits toolkits with no browsable tools and sorts by label", () => {
    const result = groupToolkitBrowserRows(TOOLKITS, [
      row({ toolkitSlug: "stripe", toolSlug: "STRIPE_LIST_CHARGES" }),
    ]);
    expect(result.map((t) => t.label)).toEqual(["Stripe"]);
  });
});
