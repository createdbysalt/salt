import { AdminTabs } from "../../_components/AdminTabs";

const USER_TABS = [
  { href: "/ops/users", label: "Overview" },
  { href: "/ops/users/prospects", label: "Prospects" },
  { href: "/ops/users/people", label: "People" },
] as const;

/** Pill tabs for the Users ops surface — same pattern as ConnectorTabs. */
export function UserTabs({ active }: { active: string }) {
  return (
    <AdminTabs tabs={USER_TABS} active={active} ariaLabel="User sections" />
  );
}
