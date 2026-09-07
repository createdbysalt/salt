/**
 * Founder ops alert emails (Founder Ops Phase 1) — Resend.
 *
 * Internal-only failure alerting (slug canary, future ops signals). NEVER
 * user-visible: recipients come from OPS_ALERT_EMAIL, falling back to the
 * PLATFORM_ADMIN_EMAILS allowlist. Unset = nobody (fail closed, no send).
 *
 * Plain structure cloned from the waitlist admin notification — these are
 * operator emails, evidence-first, no marketing layout.
 */

export function getOpsAlertRecipients(
  env: Record<string, string | undefined>,
): string[] {
  const raw = env.OPS_ALERT_EMAIL ?? env.PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export type OpsAlertEmail = {
  subject: string;
  html: string;
  text: string;
};

export function buildOpsAlertEmail(input: {
  subject: string;
  lines: string[];
}): OpsAlertEmail {
  const text = [input.subject, "", ...input.lines].join("\n");

  const htmlRows = input.lines
    .map(
      (line) =>
        `<tr><td style="padding: 4px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; color: #1a1a1a;">${escapeHtml(
          line,
        )}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin: 0; padding: 24px; background-color: #ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; border-collapse: collapse;">
    <tr>
      <td style="padding-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 600; color: #1a1a1a;">
        ${escapeHtml(input.subject)}
      </td>
    </tr>
    ${htmlRows}
  </table>
</body>
</html>`;

  return { subject: input.subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the alert. No-ops (without throwing) when no recipients are
 * configured — an unconfigured ops email must never break the cron.
 */
export async function sendOpsAlertEmail(input: {
  subject: string;
  lines: string[];
}): Promise<{ sent: boolean; recipients: string[] }> {
  const recipients = getOpsAlertRecipients(process.env);
  if (recipients.length === 0) {
    console.warn(
      `[Ops alert] No recipients (OPS_ALERT_EMAIL / PLATFORM_ADMIN_EMAILS unset) — skipped: ${input.subject}`,
    );
    return { sent: false, recipients: [] };
  }

  const { sendEmail } = await import("@/app/_lib/email/resend");
  const { subject, html, text } = buildOpsAlertEmail(input);

  await sendEmail({ to: recipients, subject, html, text });
  return { sent: true, recipients };
}
