import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Check inbound emails
  const { data: inbound } = await supabase
    .from("client_emails")
    .select("id, subject, direction, created_at, sender_email")
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(
    "Inbound emails:",
    inbound?.map((e) => ({
      id: e.id,
      subject: e.subject,
      from: e.sender_email,
      created: e.created_at,
    }))
  );

  // Check gmail sync logs
  const { data: logs } = await supabase
    .from("gmail_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nRecent sync logs:", logs);
}

check();
