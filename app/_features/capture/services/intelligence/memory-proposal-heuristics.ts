import type { MemoryProposal } from "../../types/memory-proposals";
import {
  MAX_MEMORY_PROPOSALS_PER_EMAIL,
  MIN_MEMORY_PROPOSAL_CONFIDENCE,
} from "../../types/memory-proposals";
import type { SenderProfileRegistry } from "../../types/sender-profiles";
import { classifyCaptureNoise, emailToNoiseInput } from "./capture-noise";
import {
  classifyEmailSender,
  filterMemoryProposalsForSender,
  isKnownSaasVendorEmail,
  isVendorOrgName,
} from "./email-sender-context";
import type { EmailToAnalyze } from "./email-analyzer";
import { normalizeEmailText, subjectTitle } from "./email-heuristics";
import { extractDomain } from "../system-plays/person-resolver";

const MEETING_SUBJECT_PATTERNS = [
  /\btraining session\b/i,
  /\bworkshop\b/i,
  /\bcalendar invite\b/i,
  /\bmeeting\b/i,
  /\bsession\b/i,
  /\bwebinar\b/i,
  /\boffice hours\b/i,
];

const WORK_SUBJECT_PATTERNS = [
  /\bsite strategy\b/i,
  /\bready for review\b/i,
  /\bdeliverable\b/i,
  /\bprototype\b/i,
  /\bmockup\b/i,
  /\bwireframe\b/i,
  /\bdeck\b/i,
  /\bdocument is ready\b/i,
];

const ORG_NAME_IN_SUBJECT = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractOrgNameFromSubject(subject: string): string | null {
  const cleaned = subject.replace(/^(re|fwd):\s*/gi, "").trim();
  const mannaMatch = cleaned.match(/\bmanna\s*house\b/i);
  if (mannaMatch) return "Manna House";

  const camelMatch = cleaned.match(/\b([a-z]+)(house|church|studio|agency|inc)\b/i);
  if (camelMatch) {
    const raw = camelMatch[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  const titled = cleaned.match(ORG_NAME_IN_SUBJECT);
  if (titled?.[1] && titled[1].split(/\s+/).length <= 4) {
    return titled[1];
  }

  return null;
}

function extractWorkName(subject: string, content: string): string {
  const strategyMatch = subject.match(/\b(site strategy|strategy deck|homepage|brand strategy)\b/i);
  if (strategyMatch) {
    return strategyMatch[0]
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const reviewMatch = subject.match(/(.+?)\s+is ready for review/i);
  if (reviewMatch?.[1]) {
    return reviewMatch[1].trim();
  }

  const cleaned = subject.replace(/^(re|fwd):\s*/gi, "").trim();
  if (cleaned.length > 0) return cleaned.slice(0, 80);
  const firstLine = content.split("\n").find((line) => line.trim().length > 8);
  return firstLine?.trim().slice(0, 80) ?? "New work item";
}

function domainFromEmail(email: string): string | undefined {
  return extractDomain(email) ?? undefined;
}

function pushProposal(
  proposals: MemoryProposal[],
  proposal: Omit<MemoryProposal, "system_play"> & { system_play: MemoryProposal["system_play"] }
): void {
  if (proposal.confidence < MIN_MEMORY_PROPOSAL_CONFIDENCE) return;
  if (proposals.length >= MAX_MEMORY_PROPOSALS_PER_EMAIL) return;

  const duplicate = proposals.some(
    (existing) =>
      existing.surface === proposal.surface &&
      normalizeForMatch(existing.hint.name ?? "") ===
        normalizeForMatch(proposal.hint.name ?? "")
  );
  if (duplicate) return;

  proposals.push(proposal);
}

/**
 * Deterministic Memory surface proposals from email subject/body.
 */
export function detectMemoryProposals(
  email: EmailToAnalyze,
  options?: { registry?: SenderProfileRegistry }
): MemoryProposal[] {
  const noise = classifyCaptureNoise(emailToNoiseInput(email));
  if (noise.isNoise) return [];

  const sender = classifyEmailSender(
    {
      from_email: email.from_email,
      from_name: email.from_name,
      subject: email.subject,
      body_text: email.body_text,
      snippet: email.snippet,
    },
    { registry: options?.registry }
  );
  if (sender.kind === "vendor_saas") {
    return [];
  }

  const proposals: MemoryProposal[] = [];
  const content = normalizeEmailText(email);
  const subject = email.subject;
  const combined = `${subject}\n${content}`;

  const isMeetingSubject = MEETING_SUBJECT_PATTERNS.some((p) => p.test(combined));
  if (isMeetingSubject || email.calendar_invite) {
    pushProposal(proposals, {
      surface: "meetings",
      action: "create",
      hint: {
        name: email.calendar_invite?.title ?? subjectTitle(email, "Meeting"),
        datetime: email.calendar_invite?.start_at,
      },
      confidence: email.calendar_invite ? 92 : 78,
      reason: email.calendar_invite
        ? "Calendar invite attachment detected in email."
        : "Subject or body mentions a session, training, or meeting.",
      system_play: "system:create-meeting",
    });
  }

  const orgName = extractOrgNameFromSubject(subject);
  if (orgName && !isVendorOrgName(orgName)) {
    pushProposal(proposals, {
      surface: "orgs",
      action: "create",
      hint: {
        name: orgName,
        domain: domainFromEmail(email.from_email),
      },
      confidence: orgName.toLowerCase().includes("manna") ? 82 : 75,
      reason: `Organization "${orgName}" appears in the email context.`,
      system_play: "system:create-org",
    });
  }

  const isWorkSubject = WORK_SUBJECT_PATTERNS.some((p) => p.test(combined));
  if (isWorkSubject) {
    pushProposal(proposals, {
      surface: "work",
      action: "create",
      hint: {
        name: extractWorkName(subject, content),
      },
      confidence: 80,
      reason: "Email references deliverable or project work ready for review.",
      system_play: "system:create-work",
    });
  }

  if (!email.is_sent_by_user && !proposals.some((p) => p.surface === "people")) {
    const senderDomain = domainFromEmail(email.from_email);
    if (
      email.from_name &&
      senderDomain &&
      !isKnownSaasVendorEmail(email.from_email)
    ) {
      pushProposal(proposals, {
        surface: "people",
        action: "link",
        hint: {
          name: email.from_name,
          domain: senderDomain,
        },
        confidence: 72,
        reason: "Known sender — link email thread to their person record.",
        system_play: "system:create-person",
      });
    }
  }

  return filterMemoryProposalsForSender(proposals, sender);
}

export function mergeMemoryProposals(
  heuristic: MemoryProposal[],
  llm: MemoryProposal[]
): MemoryProposal[] {
  const merged = [...heuristic];
  const seen = new Set(heuristic.map((p) => `${p.surface}:${normalizeForMatch(p.hint.name ?? "")}`));

  for (const proposal of llm) {
    if (proposal.confidence < MIN_MEMORY_PROPOSAL_CONFIDENCE) continue;
    const key = `${proposal.surface}:${normalizeForMatch(proposal.hint.name ?? "")}`;
    if (seen.has(key)) continue;
    if (merged.length >= MAX_MEMORY_PROPOSALS_PER_EMAIL) break;
    merged.push(proposal);
    seen.add(key);
  }

  return merged;
}
