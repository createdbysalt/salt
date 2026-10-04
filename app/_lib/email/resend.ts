import { Resend } from "resend";
import config from "@/config";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export function getResendClient(): Resend {
  return resend;
}

type EmailAttachment = {
  filename?: string;
  content: string | Buffer;
  contentType?: string;
  inlineContentId?: string;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
  fromName,
  attachments,
}: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string | string[];
  /** Custom display name for the "from" field (e.g., studio name). Email domain stays the same. */
  fromName?: string;
  attachments?: EmailAttachment[];
}) => {
  // Build from address: either custom name with default domain, or full default
  const defaultFrom = config.resend.fromAdmin;
  const fromAddress = fromName
    ? `${fromName} <${defaultFrom.match(/<(.+)>/)?.[1] || "notifications@usesalt.io"}>`
    : defaultFrom;

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    text,
    html,
    ...(replyTo && { replyTo }),
    ...(attachments?.length && { attachments }),
  });

  if (error) {
    console.error("Error sending email:", JSON.stringify(error, null, 2));
    throw new Error(`Resend error: ${error.message} (name: ${error.name})`);
  }

  return data;
};
