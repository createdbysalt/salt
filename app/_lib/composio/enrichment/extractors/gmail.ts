import type { ConnectorCategory, ExtractorResult } from "../types";
import type { Extractor, ExtractorContext } from "./base";
import { emptyResult } from "./base";
import { getConnectionStatus } from "../../connections";
import { fetchGmailMessagesPage, getGmailMessage } from "../../actions";
import type { GmailMessage } from "../../types";

const GMAIL_SEARCH_LIMIT = 10;
const GMAIL_FULL_FETCH_LIMIT = 3;

export const gmailExtractor: Extractor = {
  category: "email" as ConnectorCategory,
  supportedToolkits: ["gmail"],

  async extract(ctx: ExtractorContext): Promise<ExtractorResult> {
    const source = "gmail";

    if (!ctx.seed.email) {
      return emptyResult(source);
    }

    const connection = await getConnectionStatus("gmail", ctx.workspaceId);
    if (!connection.connected || !connection.composioConnectionId) {
      return emptyResult(source);
    }

    try {
      const query = `from:${ctx.seed.email} OR to:${ctx.seed.email}`;
      const page = await fetchGmailMessagesPage(
        { query, maxResults: GMAIL_SEARCH_LIMIT },
        connection.composioConnectionId,
        ctx.workspaceId,
        { skipAuthCheck: true, workspaceId: ctx.workspaceId, unattended: true }
      );

      if (!page.messages || page.messages.length === 0) {
        return emptyResult(source);
      }

      const messageIds = page.messages
        .slice(0, GMAIL_FULL_FETCH_LIMIT)
        .map((m: unknown) => {
          const msg = m as { id?: string; message_id?: string };
          return msg.id ?? msg.message_id;
        })
        .filter(Boolean) as string[];

      const fullMessages: GmailMessage[] = [];
      for (const messageId of messageIds) {
        try {
          const msg = await getGmailMessage(
            messageId,
            connection.composioConnectionId,
            ctx.workspaceId,
            { skipAuthCheck: true, workspaceId: ctx.workspaceId, unattended: true }
          );
          if (msg) fullMessages.push(msg);
        } catch {
          // Skip failed message fetches
        }
      }

      if (fullMessages.length === 0) {
        return emptyResult(source);
      }

      const extracted = extractFromGmailMessages(fullMessages, ctx.seed.email);

      return {
        source,
        fields: extracted.fields,
        connections: extracted.connections,
        notes: extracted.notes,
        hasData: Object.keys(extracted.fields).length > 0 || extracted.notes.length > 0,
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

function extractFromGmailMessages(messages: GmailMessage[], targetEmail: string): GmailExtraction {
  const fields: GmailExtraction["fields"] = {};
  const orgs: Array<{ name: string; domain?: string }> = [];
  const notes: GmailExtraction["notes"] = [];

  for (const message of messages) {
    const headers = message.payload?.headers ?? [];
    const fromHeader = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
    const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
    const date = headers.find((h) => h.name.toLowerCase() === "date")?.value;

    const isFromTarget = fromHeader.toLowerCase().includes(targetEmail.toLowerCase());

    if (isFromTarget) {
      const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
      if (nameMatch && !fields.name) {
        const name = nameMatch[1].trim();
        if (name && name !== targetEmail.split("@")[0]) {
          fields.name = { value: name, confidence: 0.9, raw: fromHeader };
        }
      }

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
            const domain = targetEmail.split("@")[1];
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
