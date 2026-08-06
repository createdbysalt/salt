import type { ConnectorCategory, EnrichmentSeed, ExtractorResult } from "../types";
import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import { getConnectionStatusAdmin } from "../../connections";
import { fetchGmailMessagesPage, getGmailMessage } from "../../actions";
import type { GmailMessage } from "../../types";
import {
  extractMessageIdFromRow,
  extractSenderFromRow,
  extractSubjectFromRow,
  extractRecipientsFromRow,
  extractEmailFromHeader,
  headerMatchesTarget,
} from "../../parsers/gmail-rows";

const GMAIL_SEARCH_LIMIT = 10;
const GMAIL_FULL_FETCH_LIMIT = 3;

export function buildGmailPersonSearchQuery(seed: Pick<EnrichmentSeed, "email" | "name">): string | null {
  if (seed.email?.trim()) {
    const email = seed.email.trim();
    return `from:${email} OR to:${email}`;
  }

  if (seed.name?.trim()) {
    const quoted = `"${seed.name.trim()}"`;
    return `from:${quoted} OR to:${quoted} OR ${quoted}`;
  }

  return null;
}

export const extractMessageIdFromGmailRow = extractMessageIdFromRow;
export const extractSenderFromGmailRow = extractSenderFromRow;
export const extractSubjectFromGmailRow = extractSubjectFromRow;
export const messageFromHeaderMatchesTarget = headerMatchesTarget;

function gmailRowMatchesTarget(
  row: unknown,
  target: Pick<EnrichmentSeed, "email" | "name">,
): boolean {
  const sender = extractSenderFromRow(row);
  if (sender && headerMatchesTarget(sender, target)) {
    return true;
  }

  for (const participant of extractRecipientsFromRow(row)) {
    if (headerMatchesTarget(participant, target)) {
      return true;
    }
  }

  return false;
}

export const gmailExtractor: Extractor = {
  category: "email" as ConnectorCategory,
  supportedToolkits: ["gmail"],

  async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
    const source = "gmail";
    const query = buildGmailPersonSearchQuery(ctx.seed);

    if (!query) {
      return emptyResult(source);
    }

    const connection = await getConnectionStatusAdmin("gmail", ctx.workspaceId);
    if (!connection.connected || !connection.composioConnectionId) {
      console.log("[enrichment:gmail] Gmail not connected for workspace", ctx.workspaceId);
      return emptyResult(source);
    }

    try {
      const page = await fetchGmailMessagesPage(
        { query, maxResults: GMAIL_SEARCH_LIMIT },
        connection.composioConnectionId,
        ctx.workspaceId,
        { skipAuthCheck: true, workspaceId: ctx.workspaceId, unattended: true },
      );

      if (!page.messages || page.messages.length === 0) {
        console.log("[enrichment:gmail] No messages for query:", query);
        return emptyResult(source);
      }

      console.log(
        `[enrichment:gmail] Found ${page.messages.length} message(s) for query:`,
        query,
      );

      const metadataExtraction = extractFromGmailMetadataRows(page.messages, ctx.seed);

      const messageIds = page.messages
        .slice(0, GMAIL_FULL_FETCH_LIMIT)
        .map((row) => extractMessageIdFromGmailRow(row))
        .filter(Boolean) as string[];

      const fullMessages: GmailMessage[] = [];
      for (const messageId of messageIds) {
        try {
          const msg = await getGmailMessage(
            messageId,
            connection.composioConnectionId,
            ctx.workspaceId,
            { skipAuthCheck: true, workspaceId: ctx.workspaceId, unattended: true },
          );
          if (msg) fullMessages.push(msg);
        } catch (error) {
          console.warn("[enrichment:gmail] Failed to hydrate message", messageId, error);
        }
      }

      const fullExtraction =
        fullMessages.length > 0
          ? extractFromGmailMessages(fullMessages, ctx.seed)
          : { fields: {}, connections: {}, notes: [] as GmailExtraction["notes"] };

      const merged = mergeGmailExtractions(metadataExtraction, fullExtraction);

      return {
        source,
        fields: merged.fields,
        connections: merged.connections,
        notes: merged.notes,
        hasData: Object.keys(merged.fields).length > 0 || merged.notes.length > 0,
      };
    } catch (error) {
      console.error("[enrichment:gmail] Error extracting from Gmail:", error);
      return emptyResult(source);
    }
  },
};

interface GmailExtraction {
  fields: Record<string, { value: string; confidence: number; raw?: string }>;
  connections: {
    orgs?: Array<{ name: string; domain?: string }>;
  };
  notes: Array<{ content: string; timestamp?: string }>;
}

function mergeGmailExtractions(...extractions: GmailExtraction[]): GmailExtraction {
  const merged: GmailExtraction = { fields: {}, connections: {}, notes: [] };

  for (const extraction of extractions) {
    for (const [key, field] of Object.entries(extraction.fields)) {
      if (!merged.fields[key] || field.confidence > merged.fields[key].confidence) {
        merged.fields[key] = field;
      }
    }

    if (extraction.connections.orgs) {
      merged.connections.orgs = [...(merged.connections.orgs ?? []), ...extraction.connections.orgs];
    }

    for (const note of extraction.notes) {
      if (merged.notes.length >= 5) break;
      if (!merged.notes.some((existing) => existing.content === note.content)) {
        merged.notes.push(note);
      }
    }
  }

  return merged;
}

function applyHeaderExtraction(
  fields: GmailExtraction["fields"],
  headerValue: string,
  target: Pick<EnrichmentSeed, "email" | "name">,
): void {
  const extractedEmail = extractEmailFromHeader(headerValue);
  if (extractedEmail && !fields.email) {
    fields.email = { value: extractedEmail, confidence: 0.95, raw: headerValue };
  }

  const nameMatch = headerValue.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch && !fields.name) {
    const name = nameMatch[1].trim();
    const emailForCompare = extractedEmail ?? target.email;
    if (name && (!emailForCompare || name.toLowerCase() !== emailForCompare.split("@")[0])) {
      fields.name = { value: name, confidence: 0.9, raw: headerValue };
    }
  }
}

function extractFromGmailMetadataRows(
  rows: unknown[],
  target: Pick<EnrichmentSeed, "email" | "name">,
): GmailExtraction {
  const fields: GmailExtraction["fields"] = {};
  const notes: GmailExtraction["notes"] = [];

  for (const row of rows) {
    if (!gmailRowMatchesTarget(row, target)) {
      continue;
    }

    const sender = extractSenderFromRow(row);
    if (sender) {
      applyHeaderExtraction(fields, sender, target);
    }

    for (const participant of extractRecipientsFromRow(row)) {
      if (headerMatchesTarget(participant, target)) {
        applyHeaderExtraction(fields, participant, target);
      }
    }

    const subject = extractSubjectFromRow(row);
    if (subject && notes.length < 5) {
      notes.push({ content: `Email thread: "${subject}"` });
    }
  }

  return { fields, connections: {}, notes };
}

function extractFromGmailMessages(
  messages: GmailMessage[],
  target: Pick<EnrichmentSeed, "email" | "name">,
): GmailExtraction {
  const fields: GmailExtraction["fields"] = {};
  const orgs: Array<{ name: string; domain?: string }> = [];
  const notes: GmailExtraction["notes"] = [];

  for (const message of messages) {
    const headers = message.payload?.headers ?? [];
    const fromHeader = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
    const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
    const date = headers.find((h) => h.name.toLowerCase() === "date")?.value;

    const isFromTarget = messageFromHeaderMatchesTarget(fromHeader, target);

    if (isFromTarget) {
      applyHeaderExtraction(fields, fromHeader, target);

      const extractedEmail = fields.email?.value ?? target.email;
      const bodyText = extractBodyText(message);
      if (bodyText) {
        const signature = extractSignature(bodyText);
        if (signature) {
          const sigFields = parseSignature(signature);

          if (sigFields.phone && !fields.phone) {
            fields.phone = { value: sigFields.phone, confidence: 0.85, raw: signature };
          }
          if (sigFields.title && !fields.title) {
            fields.title = { value: sigFields.title, confidence: 0.8, raw: signature };
          }
          if (sigFields.organization && !fields.organization) {
            fields.organization = { value: sigFields.organization, confidence: 0.8, raw: signature };
            const domain = typeof extractedEmail === "string" ? extractedEmail.split("@")[1] : undefined;
            if (domain && !domain.includes("gmail") && !domain.includes("yahoo") && !domain.includes("hotmail")) {
              orgs.push({ name: sigFields.organization, domain });
            }
          }
        }
      }
    }

    if (subject && notes.length < 5) {
      notes.push({
        content: `Email thread: "${subject}"`,
        timestamp: date,
      });
    }
  }

  return {
    fields,
    connections: orgs.length > 0 ? { orgs } : {},
    notes,
  };
}

function extractBodyText(message: GmailMessage): string {
  const payload = message.payload;
  if (!payload) return "";

  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        try {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        } catch {
          continue;
        }
      }
    }
  }

  return "";
}

function extractSignature(bodyText: string): string | null {
  const lines = bodyText.split("\n");

  const signatureMarkers = ["--", "regards", "best", "thanks", "cheers", "sincerely"];
  let signatureStart = -1;

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const line = lines[i].toLowerCase().trim();
    if (signatureMarkers.some((m) => line.startsWith(m))) {
      signatureStart = i;
      break;
    }
  }

  if (signatureStart === -1) {
    signatureStart = Math.max(0, lines.length - 10);
  }

  const signatureLines = lines.slice(signatureStart).join("\n");
  return signatureLines.length > 10 ? signatureLines : null;
}

function parseSignature(signature: string): {
  phone?: string;
  title?: string;
  organization?: string;
} {
  const result: { phone?: string; title?: string; organization?: string } = {};

  const phonePatterns = [
    /(?:phone|tel|mobile|cell|ph)[:\s]*([+\d\s().-]{10,})/i,
    /([+]?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/,
  ];

  for (const pattern of phonePatterns) {
    const match = signature.match(pattern);
    if (match) {
      result.phone = match[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  const lines = signature.split("\n").map((l) => l.trim()).filter(Boolean);

  const titleIndicators = [
    "director", "manager", "engineer", "designer", "developer", "consultant",
    "founder", "ceo", "cto", "cfo", "coo", "president", "vp", "vice president",
    "head of", "lead", "senior", "junior", "associate", "partner", "principal",
    "architect", "analyst", "specialist", "coordinator", "executive",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (titleIndicators.some((t) => lower.includes(t))) {
      if (line.length < 80 && !line.includes("@") && !line.match(/[+\d]{10,}/)) {
        const parts = line.split(/[|,]/);
        if (parts.length >= 2) {
          result.title = parts[0].trim();
          result.organization = parts[1].trim();
        } else {
          result.title = line;
        }
        break;
      }
    }
  }

  if (!result.organization) {
    for (const line of lines) {
      if (
        line.length > 2 &&
        line.length < 50 &&
        !line.includes("@") &&
        !line.match(/[+\d]{10,}/) &&
        !line.toLowerCase().match(/^(regards|best|thanks|cheers|sincerely)/)
      ) {
        const words = line.split(/\s+/);
        if (words.length <= 5 && words.every((w) => /^[A-Z]/.test(w))) {
          result.organization = line;
          break;
        }
      }
    }
  }

  return result;
}
