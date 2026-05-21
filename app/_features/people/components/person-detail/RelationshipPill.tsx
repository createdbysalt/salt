"use client";

import { StatusPill } from "@repo/ui";

export function RelationshipPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    client: "var(--relationship-clients)",
    prospect: "var(--relationship-clients)",
    past_client: "var(--relationship-team)",
    partner: "var(--relationship-partners)",
    vendor: "var(--relationship-vendors)",
    internal: "var(--relationship-team)",
  };
  const labelMap: Record<string, string> = {
    client: "CLIENT",
    prospect: "PROSPECT",
    past_client: "PAST",
    partner: "PARTNER",
    vendor: "VENDOR",
    internal: "TEAM",
    other: "OTHER",
  };
  return (
    <StatusPill
      color={colorMap[status] ?? "var(--relationship-team)"}
      label={labelMap[status] ?? "OTHER"}
    />
  );
}
