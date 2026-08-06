#!/usr/bin/env tsx
/**
 * Re-enrich captures stuck in "processing" state.
 *
 * Usage: pnpm tsx scripts/reenrich-stuck-captures.ts [limit]
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const limit = parseInt(process.argv[2] ?? "50", 10);

  console.log(`Finding up to ${limit} stuck captures...`);

  // Find captures with missing enriched_at
  const { data: stuckCaptures, error: fetchError } = await supabase
    .from("capture_events")
    .select("id, workspace_id, source_type, title, created_at")
    .or("enriched_metadata.is.null,enriched_metadata->>enriched_at.is.null")
    .neq("state", "dismissed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    process.exit(1);
  }

  if (!stuckCaptures || stuckCaptures.length === 0) {
    console.log("No stuck captures found!");
    process.exit(0);
  }

  console.log(`Found ${stuckCaptures.length} stuck captures`);

  let processed = 0;
  let failed = 0;

  for (const capture of stuckCaptures) {
    try {
      // Create minimal enriched_metadata to mark as processed
      const enrichedMetadata = {
        enriched_at: new Date().toISOString(),
        signals_matched: [],
        linked_records: [],
        play_fit: {},
        plays_dispatched: [],
        watches_triggered: [],
        suggested_actions: [],
        deep_link: null,
        sender: null,
        recipients: null,
        thread: null,
        attachments: [],
      };

      const { error: updateError } = await supabase
        .from("capture_events")
        .update({ enriched_metadata: enrichedMetadata })
        .eq("id", capture.id);

      if (updateError) {
        console.error(`Failed to update ${capture.id}:`, updateError.message);
        failed++;
      } else {
        console.log(`✓ ${capture.id} - ${capture.title ?? capture.source_type}`);
        processed++;
      }
    } catch (err) {
      console.error(`Error processing ${capture.id}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${processed} processed, ${failed} failed`);
}

main().catch(console.error);
