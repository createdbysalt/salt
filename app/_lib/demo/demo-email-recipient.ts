/**
 * Demo recipient guard.
 *
 * In a flagged demo workspace, every outbound email a play sends or drafts
 * is redirected to the demo inbox. A live demo can then approve a play or
 * open a prepared draft without ever emailing a fake client address, and
 * the sent letter lands in an inbox we control (demo@usesalt.io).
 *
 * Both env vars must be set; either missing makes this a no-op:
 *   SALT_DEMO_WORKSPACE_IDS    comma-separated workspace ids
 *   SALT_DEMO_RECIPIENT_EMAIL  the inbox that receives everything
 */

const EMAIL_RECIPIENT_TOOLS = new Set([
  "GMAIL_SEND_EMAIL",
  "GMAIL_CREATE_EMAIL_DRAFT",
  "OUTLOOK_SEND_EMAIL",
  "OUTLOOK_CREATE_DRAFT",
]);

/** CC/BCC fields across Gmail and Outlook tool schemas. */
const SECONDARY_RECIPIENT_FIELDS = [
  "cc",
  "bcc",
  "cc_recipients",
  "bcc_recipients",
] as const;

export function demoRecipientForWorkspace(
  workspaceId: string,
  env: Record<string, string | undefined> = process.env
): string | null {
  const recipient = env.SALT_DEMO_RECIPIENT_EMAIL?.trim();
  if (!recipient) return null;
  const ids = (env.SALT_DEMO_WORKSPACE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(workspaceId) ? recipient : null;
}

/**
 * Rewrite the recipient of an email tool call when the workspace is
 * demo-flagged. Secondary recipients (cc/bcc) are dropped: they point at
 * the same fake client addresses the primary recipient did.
 */
export function applyDemoEmailRecipient(
  toolSlug: string,
  params: unknown,
  workspaceId: string
): unknown {
  if (!EMAIL_RECIPIENT_TOOLS.has(toolSlug)) return params;
  const recipient = demoRecipientForWorkspace(workspaceId);
  if (!recipient) return params;
  if (!params || typeof params !== "object") return params;

  const args = { ...(params as Record<string, unknown>) };
  if (toolSlug.startsWith("GMAIL")) {
    args.recipient_email = recipient;
  } else {
    args.to_recipients = [recipient];
  }
  if ("to" in args) args.to = recipient;
  if ("to_email" in args) args.to_email = recipient;
  for (const field of SECONDARY_RECIPIENT_FIELDS) {
    delete args[field];
  }
  return args;
}
