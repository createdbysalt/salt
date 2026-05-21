import { MOCK_ACTIONS, type MockPerson } from "@/app/_lib/demo";

export type PersonInvoiceStatus = "paid" | "pending" | "overdue" | "draft";

export type MockPersonInvoice = {
  id: string;
  number: string;
  amount: number;
  status: PersonInvoiceStatus;
  dueLabel: string;
  projectName?: string;
};

export type PersonPaymentsData = {
  lifetimeValue: number;
  outstandingAmount: number;
  clientSince: string | null;
  lastPaymentLabel: string | null;
  lastPaymentAmount: number | null;
  invoices: MockPersonInvoice[];
  pendingInvoiceActions: Array<{
    id: string;
    title: string;
    preview: string;
  }>;
};

const INVOICES_BY_PERSON: Record<string, MockPersonInvoice[]> = {
  p_sarah_chen: [
    {
      id: "inv_sarah_open",
      number: "2026-Q2-012",
      amount: 4200,
      status: "pending",
      dueLabel: "Due in 4 days",
      projectName: "Q3 Rebrand",
    },
    {
      id: "inv_sarah_paid_1",
      number: "2026-Q1-008",
      amount: 8500,
      status: "paid",
      dueLabel: "Paid Mar 12",
      projectName: "Q3 Rebrand",
    },
    {
      id: "inv_sarah_paid_2",
      number: "2025-Q4-021",
      amount: 12000,
      status: "paid",
      dueLabel: "Paid Dec 3",
      projectName: "Brand refresh",
    },
  ],
  p_mike_hart: [
    {
      id: "inv_mike_open",
      number: "2026-Q2-004",
      amount: 2800,
      status: "overdue",
      dueLabel: "12 days overdue",
      projectName: "Series A Launch",
    },
    {
      id: "inv_mike_paid",
      number: "2026-Q1-002",
      amount: 6200,
      status: "paid",
      dueLabel: "Paid Feb 8",
      projectName: "Series A Launch",
    },
  ],
};

const LAST_PAYMENT_BY_PERSON: Record<
  string,
  { label: string; amount: number }
> = {
  p_sarah_chen: { label: "Mar 12, 2026", amount: 8500 },
  p_mike_hart: { label: "Feb 8, 2026", amount: 6200 },
};

function defaultInvoices(person: MockPerson): MockPersonInvoice[] {
  if (person.outstandingAmount > 0) {
    return [
      {
        id: `inv_${person.id}_open`,
        number: "2026-Q2-001",
        amount: person.outstandingAmount,
        status: "pending",
        dueLabel: "Awaiting payment",
        projectName: person.organizationName ?? undefined,
      },
    ];
  }
  if (person.lifetimeValue > 0) {
    return [
      {
        id: `inv_${person.id}_paid`,
        number: "2026-Q1-001",
        amount: Math.round(person.lifetimeValue * 0.2),
        status: "paid",
        dueLabel: "Paid recently",
        projectName: person.organizationName ?? undefined,
      },
    ];
  }
  return [];
}

export function getMockPersonPayments(person: MockPerson): PersonPaymentsData {
  const invoices =
    INVOICES_BY_PERSON[person.id] ?? defaultInvoices(person);
  const lastPayment = LAST_PAYMENT_BY_PERSON[person.id];

  const pendingInvoiceActions = MOCK_ACTIONS.filter(
    (action) =>
      action.relatedEntityId === person.id &&
      (action.type === "invoice_draft" || action.type === "outbound_invoice")
  ).map((action) => ({
    id: action.id,
    title: action.title,
    preview: action.draftContent.slice(0, 160),
  }));

  return {
    lifetimeValue: person.lifetimeValue,
    outstandingAmount: person.outstandingAmount,
    clientSince: person.clientSince,
    lastPaymentLabel: lastPayment?.label ?? null,
    lastPaymentAmount: lastPayment?.amount ?? null,
    invoices,
    pendingInvoiceActions,
  };
}
