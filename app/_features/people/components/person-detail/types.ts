export type PersonDetailTab =
  | "overview"
  | "activity"
  | "notes"
  | "connections"
  | "payments"
  | "files";

export const PERSON_DETAIL_TABS: { id: PersonDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "connections", label: "Connections" },
  { id: "payments", label: "Payments" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "activity", label: "Activity" },
];

export function isPersonDetailTab(value: string | null): value is PersonDetailTab {
  return PERSON_DETAIL_TABS.some((tab) => tab.id === value);
}
