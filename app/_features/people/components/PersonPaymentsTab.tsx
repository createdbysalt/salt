import type { Person } from "@/app/_lib/demo/people-demo-data";
import { PaymentsTabContent } from "@/app/_features/memory/components/PaymentsTabContent";

export function PersonPaymentsTab({ person }: { person: Person }) {
  return (
    <PaymentsTabContent
      invoices={person.invoices}
      retainerTier={person.retainerTier}
      mrrCents={person.mrrCents}
    />
  );
}
