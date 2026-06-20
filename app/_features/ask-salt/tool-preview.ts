/**
 * Pure formatting helpers for Composio tool parts rendered in Ask Salt.
 *
 * SAFETY: the approval card is the user's only window into what Salt is about
 * to do. Every argument must render — known fields get friendly labels, and
 * any remaining fields are appended verbatim so nothing (e.g. an injected
 * bcc recipient) can hide from the person approving.
 */

interface KnownField {
  /** Argument keys mapped to this label (first present key wins). */
  keys: string[];
  label: string;
}

const GMAIL_FIELDS: KnownField[] = [
  { keys: ["recipient_email", "to", "recipient"], label: "To" },
  { keys: ["extra_recipients"], label: "Also to" },
  { keys: ["cc"], label: "Cc" },
  { keys: ["bcc"], label: "Bcc" },
  { keys: ["subject"], label: "Subject" },
  { keys: ["body", "message"], label: "Body" },
  { keys: ["thread_id"], label: "Thread" },
];

const CALENDAR_FIELDS: KnownField[] = [
  { keys: ["summary", "title"], label: "Event" },
  { keys: ["event_id", "eventId"], label: "Event ID" },
  { keys: ["calendar_id", "calendarId"], label: "Calendar" },
  { keys: ["start_datetime", "start"], label: "Start" },
  { keys: ["event_duration_hour"], label: "Duration (hours)" },
  { keys: ["event_duration_minutes"], label: "Duration (minutes)" },
  { keys: ["end"], label: "End" },
  { keys: ["attendees"], label: "Attendees" },
  { keys: ["location"], label: "Location" },
  { keys: ["description"], label: "Description" },
];

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Render known fields with friendly labels in order, then append every
 * remaining argument so the preview can never omit part of the payload.
 */
function formatWithKnownFields(
  record: Record<string, unknown>,
  knownFields: KnownField[],
): string | null {
  const lines: string[] = [];
  const usedKeys = new Set<string>();

  for (const field of knownFields) {
    for (const key of field.keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") {
        lines.push(`${field.label}: ${formatValue(value)}`);
        field.keys.forEach((aliasKey) => usedKeys.add(aliasKey));
        break;
      }
    }
  }

  if (lines.length === 0) {
    return null;
  }

  for (const [key, value] of Object.entries(record)) {
    if (usedKeys.has(key) || value === undefined || value === null || value === "") {
      continue;
    }
    lines.push(`${key}: ${formatValue(value)}`);
  }

  return lines.join("\n");
}

export function formatToolInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return JSON.stringify(input, null, 2);
  }

  const record = input as Record<string, unknown>;
  const lower = toolName.toLowerCase();

  if (lower.includes("gmail")) {
    const preview = formatWithKnownFields(record, GMAIL_FIELDS);
    if (preview) return preview;
  }

  if (lower.includes("calendar")) {
    const preview = formatWithKnownFields(record, CALENDAR_FIELDS);
    if (preview) return preview;
  }

  return JSON.stringify(input, null, 2);
}

/** "GMAIL_SEND_EMAIL" -> "Gmail send email" for collapsible headers. */
export function formatToolName(toolName: string): string {
  const words = toolName.replace(/-/g, "_").split("_").filter(Boolean);
  if (words.length === 0) return toolName;
  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase(),
    )
    .join(" ");
}
