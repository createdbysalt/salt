import type { MockPerson } from "@/app/_lib/demo";

export function getMockPersonFiles(person: MockPerson) {
  const company = person.organizationName ?? "Internal";

  if (person.id === "p_sarah_chen") {
    return [
      {
        id: "file_sarah_brand_guidelines",
        name: "Acme Q3 brand guidelines v4.fig",
        kind: "Design file",
        source: "Q3 Rebrand",
        updated: "Today",
        reason: "Referenced in Sarah's Friday delivery question and linked work.",
        isConfirmed: true,
      },
      {
        id: "file_sarah_invoice",
        name: "Invoice #2026-Q2-012.pdf",
        kind: "Invoice",
        source: "Payments",
        updated: "Today",
        reason: "Payment timing was captured alongside the Q3 Rebrand delivery.",
        isConfirmed: true,
      },
      {
        id: "file_sarah_contract",
        name: "Acme retainer agreement.pdf",
        kind: "Agreement",
        source: "Company profile",
        updated: "May 1",
        reason: "Governs active work and payment terms for Acme Corp.",
        isConfirmed: true,
      },
    ];
  }

  return [
    {
      id: `file_${person.id}_brief`,
      name: `${company} relationship brief.pdf`,
      kind: "Brief",
      source: "Salt summary",
      updated: "This week",
      reason: "Generated from notes, activity, and linked work.",
      isConfirmed: true,
    },
    {
      id: `file_${person.id}_notes`,
      name: `${person.name} meeting notes.md`,
      kind: "Notes",
      source: "Capture",
      updated: "This month",
      reason: "Mentions this person and their current relationship context.",
      isConfirmed: false,
    },
  ];
}
