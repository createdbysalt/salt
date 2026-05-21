import {
  MOCK_WORTH_REACHING_OUT,
  type MockPerson,
} from "@/app/_lib/demo";

export function openAskSalt(prompt: string) {
  try {
    window.sessionStorage.setItem("askSaltPrefill", prompt);
  } catch {
    // Ask Salt can still open without a prefill if storage is unavailable.
  }

  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

export function draftMessageForPerson(person: MockPerson) {
  window.dispatchEvent(
    new CustomEvent("salt:open-capture", {
      detail: {
        intent: "message",
        people: [person.id],
      },
    })
  );
}

export function getPersonSummary(person: MockPerson): string {
  const queueItem = MOCK_WORTH_REACHING_OUT.find((item) => item.personId === person.id);
  if (person.aiSummary) return person.aiSummary;
  return queueItem?.summary ?? "";
}

export function getPersonPrimaryActionLabel(): string {
  return "Draft message";
}

export function formatLastContact(days: number | null): string {
  if (days === null) return "No contact yet";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export const RELATIONSHIP_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "prospect", label: "Prospect" },
  { value: "past_client", label: "Past client" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
] as const;

export function getRelationshipLabel(
  status: MockPerson["relationshipStatus"]
): string {
  return (
    RELATIONSHIP_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}
