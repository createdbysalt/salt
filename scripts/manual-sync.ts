/**
 * Manual Gmail sync trigger and attachment debugger
 * Usage: npx tsx scripts/manual-sync.ts
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  headers?: Array<{ name?: string; value?: string }>;
  parts?: GmailPart[];
}

function inspectParts(part: GmailPart, depth = 0): void {
  const indent = "  ".repeat(depth);
  const filename = part.filename || "(no filename)";
  const hasAttachmentId = part.body?.attachmentId ? "YES" : "no";
  const hasData = part.body?.data ? `YES (${part.body.data.length} chars)` : "no";
  const size = part.body?.size || 0;

  console.log(
    `${indent}[${part.mimeType}] filename="${filename}" attachmentId=${hasAttachmentId} data=${hasData} size=${size}`
  );

  if (part.parts) {
    for (const subPart of part.parts) {
      inspectParts(subPart, depth + 1);
    }
  }
}

async function manualSync() {
  // Get the active watch
  const { data: watch, error: watchError } = await supabase
    .from("gmail_watches")
    .select("id, user_id, studio_id, gmail_email")
    .eq("status", "active")
    .single();

  if (watchError || !watch) {
    console.error("No active watch found:", watchError);
    return;
  }

  console.log("Found active watch for:", watch.gmail_email);
  console.log("User ID:", watch.user_id);
  console.log("Studio ID:", watch.studio_id);

  // Get Gmail connection
  const { data: connection, error: connError } = await supabase
    .from("gmail_connections")
    .select("access_token, refresh_token")
    .eq("user_id", watch.user_id)
    .eq("studio_id", watch.studio_id)
    .single();

  console.log("Connection query result:", connection ? "found" : "not found", connError?.message || "");

  if (!connection) {
    console.error("No Gmail connection found for user:", watch.user_id, "studio:", watch.studio_id);
    return;
  }

  console.log("Access token:", connection.access_token ? "present" : "missing");
  console.log("Refresh token:", connection.refresh_token ? "present" : "missing");

  // Create OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Check database for recent inbound email
  console.log("\n--- Database Check ---");
  const { data: inbound } = await supabase
    .from("client_emails")
    .select("id, subject, sender_email, gmail_message_id, created_at")
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (inbound) {
    console.log("Most recent inbound email:", {
      id: inbound.id,
      subject: inbound.subject,
      from: inbound.sender_email,
      gmail_message_id: inbound.gmail_message_id,
    });

    // Check for attachments in database
    const { data: files } = await supabase
      .from("project_files")
      .select("id, file_name, source_type")
      .eq("source_email_id", inbound.id);

    console.log("Attachments in DB:", files?.length ? files : "NONE");

    // Fetch the actual Gmail message to inspect its structure
    if (inbound.gmail_message_id) {
      console.log("\n--- Gmail API Inspection ---");
      console.log(`Fetching message ${inbound.gmail_message_id} from Gmail...`);

      try {
        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: inbound.gmail_message_id,
          format: "full",
        });

        const message = messageResponse.data;
        console.log("\nMessage structure:");
        if (message.payload) {
          inspectParts(message.payload as GmailPart);
        }

        // Count parts with filenames
        let attachmentCount = 0;
        function countAttachments(part: GmailPart): void {
          if (part.filename && part.filename.length > 0) {
            attachmentCount++;
            console.log(`\n✓ FOUND ATTACHMENT: "${part.filename}" (${part.mimeType})`);
          }
          if (part.parts) {
            for (const subPart of part.parts) {
              countAttachments(subPart);
            }
          }
        }
        countAttachments(message.payload as GmailPart);

        console.log(`\nTotal attachments in Gmail message: ${attachmentCount}`);
        if (attachmentCount === 0) {
          console.log("\n⚠️  This email has NO ATTACHMENTS in Gmail.");
          console.log("Send a new email WITH an attachment to test attachment extraction.");
        }
      } catch (error) {
        console.error("Error fetching from Gmail:", error);
      }
    }
  } else {
    console.log("No inbound emails found in database");
  }
}

manualSync();
