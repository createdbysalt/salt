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

const MEMORY_PERSON_FIELDS: KnownField[] = [
  { keys: ["name"], label: "Person" },
  { keys: ["email"], label: "Email" },
  { keys: ["title"], label: "Title" },
  { keys: ["relationship_type"], label: "Relationship" },
  { keys: ["organization_name"], label: "Organization" },
  { keys: ["domain"], label: "Domain" },
  { keys: ["org_id"], label: "Organization ID" },
  { keys: ["user_insists_person"], label: "Treat as person despite risk" },
];

const BILLING_RECORD_FIELDS: KnownField[] = [
  { keys: ["partyName"], label: "Party" },
  { keys: ["direction"], label: "Direction" },
  { keys: ["number"], label: "Number" },
  { keys: ["amountCents"], label: "Amount (cents)" },
  { keys: ["currency"], label: "Currency" },
  { keys: ["dueAt"], label: "Due" },
  { keys: ["description"], label: "Description" },
  { keys: ["category"], label: "Category" },
];

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function humanizeFieldLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatGenericFields(record: Record<string, unknown>): string {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${humanizeFieldLabel(key)}: ${formatValue(value)}`)
    .join("\n");
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
    lines.push(`${humanizeFieldLabel(key)}: ${formatValue(value)}`);
  }

  return lines.join("\n");
}

interface ScanSummaryItem {
  provider: string;
  fieldsExtracted: number;
  hadData: boolean;
}

function formatEnrichmentScanSummary(output: unknown): string | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const record = output as Record<string, unknown>;

  const scanSummary = record.scanSummary;
  if (!Array.isArray(scanSummary) || scanSummary.length === 0) return null;

  const items = scanSummary as ScanSummaryItem[];
  const parts = items.map((s) => {
    if (!s.hadData) return `${s.provider} (no data)`;
    if (s.fieldsExtracted > 0) return `${s.provider} (${s.fieldsExtracted} field${s.fieldsExtracted > 1 ? "s" : ""})`;
    return s.provider;
  });

  return parts.join(", ");
}

export function formatToolArguments(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return JSON.stringify(input, null, 2);
  }

  const record = input as Record<string, unknown>;

  // Generic executor (5.5.3): the approval card must preview the INNER tool
  // call — unwrap and format by the real slug so nothing hides in `arguments`.
  if (toolName === "execute_connector_action" && typeof record.slug === "string") {
    const inner = formatToolArguments(record.slug, record.arguments ?? {});
    return `Tool: ${formatToolName(record.slug)} (${record.slug})\n${inner}`;
  }

  const lower = toolName.toLowerCase();

  if (lower.includes("gmail")) {
    const preview = formatWithKnownFields(record, GMAIL_FIELDS);
    if (preview) return preview;
  }

  if (lower.includes("calendar")) {
    const preview = formatWithKnownFields(record, CALENDAR_FIELDS);
    if (preview) return preview;
  }

  if (toolName === "memory_create_person") {
    const preview = formatWithKnownFields(record, MEMORY_PERSON_FIELDS);
    if (preview) return preview;
  }

  if (toolName === "add_billing_record") {
    const preview = formatWithKnownFields(record, BILLING_RECORD_FIELDS);
    if (preview) return preview;
  }

  return formatGenericFields(record);
}

export const formatToolInput = formatToolArguments;

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

const MEMORY_TOOL_STEPS: Record<string, string> = {
  memory_find_people: "Search people in Memory",
  memory_find_orgs: "Search organizations in Memory",
  memory_find_meetings: "Search meetings in Memory",
  memory_create_person: "Add person to Memory",
  memory_update_person: "Update person in Memory",
  memory_classify_person: "Set relationship type",
  memory_archive_person: "Archive person",
  memory_create_org: "Add organization to Memory",
  memory_update_org: "Update organization",
  memory_archive_org: "Archive organization",
  memory_create_work: "Add work to Memory",
  memory_update_work: "Update work",
  memory_archive_work: "Archive work",
  memory_create_note: "Add note to Memory",
  memory_add_blocker: "Add blocker to work",
  memory_create_meeting: "Schedule meeting",
  memory_save_resource: "Save to Resources",
  memory_save_file: "Save to Resources",
  memory_link_person_org: "Link person to organization",
  memory_unlink_person_org: "Unlink person from organization",
  memory_link_person_work: "Link person to work",
  memory_unlink_person_work: "Unlink person from work",
  memory_link_person_person: "Link people together",
  memory_unlink_person_person: "Unlink people",
  memory_link_person_space: "Link person to space",
  memory_unlink_person_space: "Unlink person from space",
  memory_link_org_work: "Link organization to work",
  memory_unlink_org_work: "Unlink organization from work",
  memory_link_work_space: "Link work to space",
  memory_unlink_work_space: "Unlink work from space",
  add_billing_record: "Draft billing record",
  draft_playbook: "Draft playbook",
  enrich_entity_context: "Scan connected apps for context",
  enrich_entity: "Scan connected apps",
  load_playbook: "Load playbook",
  load_memory_intake: "Load Memory Care intake",
  enable_playbook: "Enable playbook",
  parse_intake: "Parse intake",
  add_to_watching: "Add to watching",
};

function formatPlaybookSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolvePlaybookDisplayName(input?: unknown, output?: unknown): string | null {
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const out = output as Record<string, unknown>;
    if (typeof out.name === "string" && out.name.trim()) {
      return out.name.trim();
    }
  }

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    if (typeof record.slug === "string" && record.slug.trim()) {
      return formatPlaybookSlug(record.slug.trim());
    }
  }

  return null;
}

/** One-line label for a tool step in the collapsed thought process. */
export function formatToolStepLabel(
  toolName: string,
  input?: unknown,
  output?: unknown,
): string {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;

    if (toolName === "load_playbook") {
      const playbook = resolvePlaybookDisplayName(input, output);
      return playbook ? `Load ${playbook} playbook` : MEMORY_TOOL_STEPS.load_playbook;
    }

    if (toolName === "load_memory_intake") {
      return MEMORY_TOOL_STEPS.load_memory_intake;
    }

    if (toolName === "enable_playbook") {
      const playbook = resolvePlaybookDisplayName(input, output);
      return playbook ? `Enable ${playbook} playbook` : MEMORY_TOOL_STEPS.enable_playbook;
    }

    if (toolName === "parse_intake") {
      const intakeLabel = resolvePlaybookDisplayName(input, output);
      if (intakeLabel) {
        const normalized =
          /memory.?care|memory.?records/i.test(intakeLabel)
            ? "Memory Care"
            : intakeLabel;
        return `Parse intake (${normalized})`;
      }
      return MEMORY_TOOL_STEPS.parse_intake;
    }

    if (toolName === "enrich_entity") {
      const entityName =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : typeof record.project_name === "string" && record.project_name.trim()
            ? record.project_name.trim()
            : null;

      const scanSummary = formatEnrichmentScanSummary(output);
      if (entityName && scanSummary) {
        return `Enriched ${entityName}: ${scanSummary}`;
      }
      if (scanSummary) {
        return `Scanned connected apps: ${scanSummary}`;
      }
      if (entityName) {
        return `Enrich ${entityName} from connected apps`;
      }
      return MEMORY_TOOL_STEPS.enrich_entity;
    }

    if (toolName === "add_to_watching") {
      const entityName =
        typeof record.entity_name === "string" && record.entity_name.trim()
          ? record.entity_name.trim()
          : null;
      if (entityName) {
        return `Watch ${entityName} for missing fields`;
      }
      return MEMORY_TOOL_STEPS.add_to_watching;
    }

    if (toolName === "search_connector_tools" && typeof record.query === "string") {
      return `Search connected app tools for “${record.query.trim()}”`;
    }
    if (toolName === "execute_connector_action" && typeof record.slug === "string") {
      return `Run ${formatToolName(record.slug)}`;
    }
  }

  const lower = toolName.toLowerCase();

  if (lower.includes("gmail")) {
    if (lower.includes("send_email") || lower === "gmail_send_email") return "Send email";
    if (lower.includes("create") && lower.includes("draft")) return "Create email draft";
    if (lower.includes("fetch") || lower.includes("list")) return "Check Gmail";
    return "Work with Gmail";
  }

  if (lower.includes("calendar")) {
    return "Check Google Calendar";
  }

  const base = MEMORY_TOOL_STEPS[toolName] ?? formatToolName(toolName);

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    if (toolName === "memory_find_people" && typeof record.query === "string" && record.query.trim()) {
      return `Search Memory for “${record.query.trim()}”`;
    }
    if (toolName === "memory_find_orgs" && typeof record.query === "string" && record.query.trim()) {
      return `Search Memory for “${record.query.trim()}”`;
    }
    if (toolName === "memory_create_person" && typeof record.name === "string" && record.name.trim()) {
      return `Add ${record.name.trim()} to people`;
    }
    if (toolName === "memory_create_org" && typeof record.name === "string" && record.name.trim()) {
      return `Add ${record.name.trim()} to organizations`;
    }
    if (toolName === "memory_create_work" && typeof record.name === "string" && record.name.trim()) {
      return `Create project ${record.name.trim()}`;
    }
    if (toolName === "memory_update_work" && typeof record.name === "string" && record.name.trim()) {
      return `Update project ${record.name.trim()}`;
    }
    if (toolName === "add_billing_record" && typeof record.partyName === "string" && record.partyName.trim()) {
      const direction = record.direction === "payable" ? "payable" : "invoice";
      return `Draft ${direction} for ${record.partyName.trim()}`;
    }
  }

  return base;
}
