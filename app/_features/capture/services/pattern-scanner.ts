/**
 * Pattern Scanner Service
 *
 * Runs periodic scans across Memory to detect patterns that should
 * trigger Plays or surface insights. Unlike event-driven triggers,
 * these patterns emerge from the absence of activity or relationships
 * between entities over time.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

// ============================================================================
// Pattern Types
// ============================================================================

/**
 * Pattern scan IDs for time-based Memory patterns.
 *
 * MIGRATION NOTE (Phase 2.7): These patterns should eventually migrate to
 * playbook-declared pattern triggers (`trigger: { type: "pattern", ... }`).
 * For now they run via hardcoded queries in SCAN_PATTERNS below.
 */
export type ScanPatternId =
  | "silence_7_days"
  | "silence_14_days"
  | "missing_follow_up"
  | "missing_entity_notes";

export interface ScanPattern {
  id: ScanPatternId;
  name: string;
  description: string;
  playerSlug: string;
  scanQuery: (workspaceId: string) => Promise<PatternMatch[]>;
}

export interface PatternMatch {
  entityType: "person" | "org" | "project";
  entityId: string;
  entityLabel: string;
  patternData: Record<string, unknown>;
  confidence: number;
  suggestedAction: string;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

const SCAN_PATTERNS: ScanPattern[] = [
  {
    id: "silence_7_days",
    name: "7-Day Silence",
    description: "People or orgs with no communication in the past 7 days",
    playerSlug: "follow-up",
    scanQuery: async (workspaceId: string): Promise<PatternMatch[]> => {
      const admin = createAdminClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // Find people with no recent captures
      const { data: silentPeople } = await admin
        .from("people")
        .select(`
          id,
          display_name,
          last_contacted_at
        `)
        .eq("workspace_id", workspaceId)
        .lt("last_contacted_at", sevenDaysAgo)
        .gt("last_contacted_at", fourteenDaysAgo)
        .not("archived_at", "is", null)
        .limit(20);

      return (silentPeople ?? []).map((person) => ({
        entityType: "person" as const,
        entityId: person.id,
        entityLabel: person.display_name ?? "Unknown",
        patternData: {
          lastContactedAt: person.last_contacted_at,
          daysSilent: Math.floor(
            (Date.now() - new Date(person.last_contacted_at).getTime()) / (24 * 60 * 60 * 1000)
          ),
        },
        confidence: 70,
        suggestedAction: `Check in with ${person.display_name ?? "this contact"} — no communication in over a week.`,
      }));
    },
  },
  {
    id: "silence_14_days",
    name: "14-Day Silence (Critical)",
    description: "People or orgs with no communication in the past 14 days",
    playerSlug: "client-risk",
    scanQuery: async (workspaceId: string): Promise<PatternMatch[]> => {
      const admin = createAdminClient();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // Find people with no recent captures (more than 14 days)
      const { data: silentPeople } = await admin
        .from("people")
        .select(`
          id,
          display_name,
          last_contacted_at
        `)
        .eq("workspace_id", workspaceId)
        .lt("last_contacted_at", fourteenDaysAgo)
        .not("archived_at", "is", null)
        .limit(20);

      return (silentPeople ?? []).map((person) => ({
        entityType: "person" as const,
        entityId: person.id,
        entityLabel: person.display_name ?? "Unknown",
        patternData: {
          lastContactedAt: person.last_contacted_at,
          daysSilent: Math.floor(
            (Date.now() - new Date(person.last_contacted_at).getTime()) / (24 * 60 * 60 * 1000)
          ),
          critical: true,
        },
        confidence: 85,
        suggestedAction: `Urgent: ${person.display_name ?? "Contact"} has been quiet for over 2 weeks. Consider reaching out.`,
      }));
    },
  },
  {
    id: "missing_follow_up",
    name: "Missing Follow-up",
    description: "Meetings from the past week with no follow-up message",
    playerSlug: "follow-up",
    scanQuery: async (workspaceId: string): Promise<PatternMatch[]> => {
      const admin = createAdminClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Find meetings that occurred 1-7 days ago
      const { data: recentMeetings } = await admin
        .from("capture_events")
        .select(`
          id,
          title,
          extracted_data,
          created_at
        `)
        .eq("workspace_id", workspaceId)
        .eq("capture_type", "meeting")
        .eq("state", "routed")
        .lt("created_at", oneDayAgo)
        .gt("created_at", sevenDaysAgo)
        .limit(20);

      if (!recentMeetings || recentMeetings.length === 0) {
        return [];
      }

      // Check for follow-up messages after each meeting
      const results: PatternMatch[] = [];

      for (const meeting of recentMeetings) {
        const extracted = meeting.extracted_data as { attendees?: string[] } | null;

        // Check if there's a message capture after this meeting
        const { data: followUps } = await admin
          .from("capture_events")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("capture_type", "message")
          .gt("created_at", meeting.created_at)
          .limit(1);

        if (!followUps || followUps.length === 0) {
          results.push({
            entityType: "project" as const,
            entityId: meeting.id,
            entityLabel: meeting.title ?? "Meeting",
            patternData: {
              meetingDate: meeting.created_at,
              attendees: extracted?.attendees ?? [],
              daysSince: Math.floor(
                (Date.now() - new Date(meeting.created_at).getTime()) / (24 * 60 * 60 * 1000)
              ),
            },
            confidence: 75,
            suggestedAction: `Send a follow-up for "${meeting.title ?? "your meeting"}" from ${Math.floor((Date.now() - new Date(meeting.created_at).getTime()) / (24 * 60 * 60 * 1000))} days ago.`,
          });
        }
      }

      return results;
    },
  },
  {
    id: "missing_entity_notes",
    name: "Missing Entity Notes",
    description: "People or orgs with 5+ interactions but no notes — Salt could learn more",
    playerSlug: "keeper",
    scanQuery: async (workspaceId: string): Promise<PatternMatch[]> => {
      const admin = createAdminClient();

      // Find people with many interactions but no confirmed notes
      // Interaction threshold: 5+ captures (emails/meetings)
      const { data: peopleWithInteractions } = await admin.rpc(
        "find_entities_missing_notes",
        {
          p_workspace_id: workspaceId,
          p_min_interactions: 5,
          p_entity_type: "person",
        }
      );

      const results: PatternMatch[] = [];

      for (const entity of peopleWithInteractions ?? []) {
        results.push({
          entityType: "person" as const,
          entityId: entity.entity_id,
          entityLabel: entity.entity_name ?? "Unknown",
          patternData: {
            interactionCount: entity.interaction_count,
            noteCount: entity.note_count,
            lastInteractionAt: entity.last_interaction_at,
          },
          confidence: 75,
          suggestedAction: `Salt could learn more about ${entity.entity_name ?? "this contact"}. ${entity.interaction_count} interactions, no notes yet.`,
        });
      }

      // Also check organizations
      const { data: orgsWithInteractions } = await admin.rpc(
        "find_entities_missing_notes",
        {
          p_workspace_id: workspaceId,
          p_min_interactions: 5,
          p_entity_type: "organization",
        }
      );

      for (const entity of orgsWithInteractions ?? []) {
        results.push({
          entityType: "org" as const,
          entityId: entity.entity_id,
          entityLabel: entity.entity_name ?? "Unknown",
          patternData: {
            interactionCount: entity.interaction_count,
            noteCount: entity.note_count,
            lastInteractionAt: entity.last_interaction_at,
          },
          confidence: 70,
          suggestedAction: `Salt could learn more about ${entity.entity_name ?? "this organization"}. ${entity.interaction_count} interactions, no notes yet.`,
        });
      }

      return results.slice(0, 20); // Limit to 20 suggestions per scan
    },
  },
];

// ============================================================================
// Scanner Functions
// ============================================================================

/**
 * Run all pattern scans for a workspace.
 */
export async function runPatternScans(
  workspaceId: string,
  options: { patternIds?: ScanPatternId[] } = {}
): Promise<{
  success: boolean;
  patterns: Array<{
    patternId: ScanPatternId;
    matches: PatternMatch[];
  }>;
  playsCreated: number;
}> {
  const { patternIds } = options;
  const patternsToRun = patternIds
    ? SCAN_PATTERNS.filter((p) => patternIds.includes(p.id))
    : SCAN_PATTERNS;

  const results: Array<{ patternId: ScanPatternId; matches: PatternMatch[] }> = [];
  let totalPlays = 0;

  for (const pattern of patternsToRun) {
    try {
      const matches = await pattern.scanQuery(workspaceId);
      results.push({ patternId: pattern.id, matches });

      // Create plays for significant matches
      if (matches.length > 0) {
        const playsCreated = await createPlaysFromMatches(workspaceId, pattern, matches);
        totalPlays += playsCreated;
      }
    } catch (error) {
      console.error(`[pattern-scanner] Error running ${pattern.id}:`, error);
    }
  }

  return { success: true, patterns: results, playsCreated: totalPlays };
}

/**
 * Create Play runs from pattern matches.
 */
async function createPlaysFromMatches(
  workspaceId: string,
  pattern: ScanPattern,
  matches: PatternMatch[]
): Promise<number> {
  const admin = createAdminClient();

  // Get player ID
  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", pattern.playerSlug)
    .single();

  if (!player) {
    return 0;
  }

  // Check for existing plays to avoid duplicates
  const entityIds = matches.map((m) => m.entityId);
  const { data: existingPlays } = await admin
    .from("play_runs")
    .select("target_id")
    .eq("workspace_id", workspaceId)
    .in("target_id", entityIds)
    .in("state", ["queued", "draft", "scheduled"])
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const existingTargetIds = new Set(existingPlays?.map((p) => p.target_id) ?? []);
  const newMatches = matches.filter((m) => !existingTargetIds.has(m.entityId));

  if (newMatches.length === 0) {
    return 0;
  }

  // Create plays
  const playRuns = newMatches.map((match) => ({
    workspace_id: workspaceId,
    player_id: player.id,
    prepared_by_player_id: player.id,
    state: "queued" as const,
    title: match.suggestedAction,
    preview: `Detected: ${pattern.name}`,
    target_type: match.entityType,
    target_id: match.entityId,
    target_label: match.entityLabel,
    recipient_label: match.entityLabel,
    channel: "Gmail",
    confidence: match.confidence,
    metadata: {
      pattern_id: pattern.id,
      pattern_data: match.patternData,
    },
  }));

  const { error } = await admin.from("play_runs").insert(playRuns);

  if (error) {
    console.error("[pattern-scanner] Failed to create plays:", error);
    return 0;
  }

  return playRuns.length;
}

/**
 * Get pattern scan status for a workspace.
 */
export async function getPatternScanStatus(workspaceId: string): Promise<{
  lastScanAt: string | null;
  nextScanAt: string | null;
  activePatterns: ScanPatternId[];
}> {
  const admin = createAdminClient();

  // Check workspace settings for scan configuration
  const { data: workspace } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  const settings = (workspace?.settings as Record<string, unknown>) ?? {};
  const scanSettings = (settings.pattern_scanner as Record<string, unknown>) ?? {};

  return {
    lastScanAt: (scanSettings.last_scan_at as string) ?? null,
    nextScanAt: (scanSettings.next_scan_at as string) ?? null,
    activePatterns: (scanSettings.active_patterns as ScanPatternId[]) ?? SCAN_PATTERNS.map((p) => p.id),
  };
}

/**
 * Schedule the next pattern scan.
 */
export async function scheduleNextScan(
  workspaceId: string,
  delayHours: number = 24
): Promise<void> {
  const admin = createAdminClient();
  const nextScanAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  // Fetch current settings
  const { data: workspace } = await admin
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .single();

  const currentSettings = (workspace?.settings as Record<string, unknown>) ?? {};
  const patternScanner = (currentSettings.pattern_scanner as Record<string, unknown>) ?? {};

  // Update with new scan time
  await admin
    .from("workspaces")
    .update({
      settings: {
        ...currentSettings,
        pattern_scanner: {
          ...patternScanner,
          next_scan_at: nextScanAt,
          last_scan_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", workspaceId);
}
