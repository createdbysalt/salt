import type { PlayCardViewModel } from "./types";

/**
 * Internal kind names that must never leak into user-facing copy.
 * (See the Play Card contract: body-slot kinds are code terms only.)
 */
const FORBIDDEN_UI_SUBSTRINGS = [
  "acting play",
  "profile play",
  "question play",
  "risk play",
  "routing play",
];

export interface PlayCardValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Fail-closed validator. A view model that does not pass MUST NOT be enqueued or
 * rendered — the queue stays consistent by rejecting malformed cards.
 */
export function validatePlayCard(vm: PlayCardViewModel): PlayCardValidationResult {
  const errors: string[] = [];

  if (!vm.id) errors.push("missing id");
  if (!vm.subject?.trim()) errors.push("missing subject");
  if (!vm.playerSlug) errors.push("missing playerSlug");

  if (vm.mode === "handled" && !vm.handled?.outcomeLabel?.trim()) {
    errors.push("handled card requires handled.outcomeLabel");
  }

  // Exactly one body must match the declared kind.
  switch (vm.kind) {
    case "acting":
      if (!vm.acting?.draftBody?.length) errors.push("acting body requires draftBody");
      break;
    case "profile":
      if (!vm.profile?.field) errors.push("profile body requires field");
      if (!vm.profile?.proposedValue?.trim()) {
        errors.push("profile body requires a non-empty proposedValue");
      }
      // No queued guesses: an unknown relationship is never a valid profile play.
      if (
        vm.profile?.field === "relationship_type" &&
        vm.profile?.proposedValue?.trim().toLowerCase() === "unknown"
      ) {
        errors.push("relationship_type 'unknown' must not be queued as a profile play");
      }
      break;
    case "question":
      if (!vm.question?.prompt?.trim()) errors.push("question body requires a prompt");
      if (!vm.question?.options?.length) errors.push("question body requires options");
      break;
    case "risk":
      if (!vm.risk?.signal?.trim()) errors.push("risk body requires a signal");
      break;
    case "routing":
      // routing is future; allow empty body but require a subject (checked above)
      break;
    default:
      errors.push(`unknown kind: ${String((vm as { kind?: unknown }).kind)}`);
  }

  // Guard against internal kind names leaking into copy.
  const copy = [vm.subject, vm.preview, vm.playbookName, vm.primaryAction?.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const forbidden of FORBIDDEN_UI_SUBSTRINGS) {
    if (copy.includes(forbidden)) {
      errors.push(`copy contains internal kind name: "${forbidden}"`);
    }
  }

  return { ok: errors.length === 0, errors };
}
