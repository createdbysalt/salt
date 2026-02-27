import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttachments() {
  // Check if source_email_id column exists by querying
  const { data: files, error: filesError } = await supabase
    .from("project_files")
    .select("id, file_name, source_type, source_email_id")
    .not("source_email_id", "is", null)
    .limit(10);

  console.log("Files with source_email_id:", files);
  if (filesError) console.log("Files error:", filesError);

  // Check ALL files to see what's there
  const { data: allFiles, error: allFilesError } = await supabase
    .from("project_files")
    .select("id, file_name, source_type, source_email_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("\nRecent files:", allFiles?.map(f => ({
    name: f.file_name,
    source_type: f.source_type,
    source_email_id: f.source_email_id,
  })));
  if (allFilesError) console.log("All files error:", allFilesError);

  // Check recent emails
  const { data: emails, error: emailsError } = await supabase
    .from("client_emails")
    .select("id, subject, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nRecent emails:", emails);
  if (emailsError) console.log("Emails error:", emailsError);
}

checkAttachments();
