import config from "@/config";
import { sendEmail } from "@/app/_lib/email/resend";
import { loadWaitlistWordmarkAttachment } from "@/app/_lib/email/waitlist-emails";
import {
  buildWaitlistSequenceEmail,
  type WaitlistSequenceSlug,
} from "@/app/_lib/email/waitlist-sequence-emails";
import { getWaitlistSequenceSendBlockedReason } from "@/app/_lib/email/waitlist-sequence-schedule";

export async function sendWaitlistSequenceEmail(input: {
  to: string;
  slug: WaitlistSequenceSlug;
}): Promise<void> {
  const blockedReason = getWaitlistSequenceSendBlockedReason(input.slug);
  if (blockedReason) {
    throw new Error(blockedReason);
  }

  const inlineLogo = await loadWaitlistWordmarkAttachment();
  const { subject, html, text } = buildWaitlistSequenceEmail(input.slug, {
    logoCid: inlineLogo?.inlineContentId,
  });

  await sendEmail({
    to: input.to.trim(),
    subject,
    html,
    text,
    replyTo: config.resend.supportEmail,
    ...(inlineLogo && { attachments: [inlineLogo] }),
  });
}
