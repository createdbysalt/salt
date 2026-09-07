import { AdminTabs } from "../../_components/AdminTabs";

const CONNECTOR_TABS = [
  { href: "/ops/connectors", label: "Overview" },
  { href: "/ops/connectors/review", label: "Review queue" },
  { href: "/ops/connectors/health", label: "Health" },
] as const;

/** Pill tabs for the Connectors ops surface — same pattern as MemoryTabs. */
export function ConnectorTabs({ active }: { active: string }) {
  return (
    <AdminTabs
      tabs={CONNECTOR_TABS}
      active={active}
      ariaLabel="Connector sections"
    />
  );
}
