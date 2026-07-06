"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  type ActionResponse,
  success,
  error,
  AddMeetingSourceSchema,
  AddMeetingSummarySchema,
  AddMeetingDecisionSchema,
  AddMeetingActionItemSchema,
  ToggleMeetingActionItemSchema,
  AttachMeetingTranscriptSchema,
  type AddMeetingSourceInput,
  type AddMeetingSummaryInput,
  type AddMeetingDecisionInput,
  type AddMeetingActionItemInput,
  type ToggleMeetingActionItemInput,
  type AttachMeetingTranscriptInput,
} from "./schemas";

// ============================================================================
// Helpers
// ============================================================================

async function verifyMeetingAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  meetingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();
  return !!data;
}

// ============================================================================
// Meeting Sources
// ============================================================================

export async function addMeetingSource(
  input: AddMeetingSourceInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = AddMeetingSourceSchema.parse(input);

    if (!(await verifyMeetingAccess(supabase, workspace.id, validated.meetingId))) {
      return error("NOT_FOUND", "Meeting not found");
    }

    const { data, error: dbError } = await supabase
      .from("meeting_sources")
      .insert({
        workspace_id: workspace.id,
        meeting_id: validated.meetingId,
        provider: validated.provider,
        kind: validated.kind,
        external_id: validated.externalId,
        source_url: validated.sourceUrl,
        workspace_integration_id: validated.workspaceIntegrationId,
        metadata: validated.metadata ?? {},
        display_name: validated.displayName,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Error adding meeting source:", dbError);
      return error("DB_ERROR", "Failed to add source");
    }

    revalidatePath(`/meetings/${validated.meetingId}`);
    return success({ id: data.id });
  } catch (err) {
    console.error("Unexpected error in addMeetingSource:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}

// ============================================================================
// Meeting Summaries
// ============================================================================

export async function addMeetingSummary(
  input: AddMeetingSummaryInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = AddMeetingSummarySchema.parse(input);

    if (!(await verifyMeetingAccess(supabase, workspace.id, validated.meetingId))) {
      return error("NOT_FOUND", "Meeting not found");
    }

    // Mark existing summaries as not current
    await supabase
      .from("meeting_summaries")
      .update({ is_current: false })
      .eq("meeting_id", validated.meetingId);

    const { data, error: dbError } = await supabase
      .from("meeting_summaries")
      .insert({
        workspace_id: workspace.id,
        meeting_id: validated.meetingId,
        content: validated.content,
        source_id: validated.sourceId,
        generated_by: validated.generatedBy ?? "manual",
        is_current: true,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Error adding meeting summary:", dbError);
      return error("DB_ERROR", "Failed to add summary");
    }

    revalidatePath(`/meetings/${validated.meetingId}`);
    return success({ id: data.id });
  } catch (err) {
    console.error("Unexpected error in addMeetingSummary:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}

// ============================================================================
// Meeting Decisions
// ============================================================================

export async function addMeetingDecision(
  input: AddMeetingDecisionInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = AddMeetingDecisionSchema.parse(input);

    if (!(await verifyMeetingAccess(supabase, workspace.id, validated.meetingId))) {
      return error("NOT_FOUND", "Meeting not found");
    }

    const { data, error: dbError } = await supabase
      .from("meeting_decisions")
      .insert({
        workspace_id: workspace.id,
        meeting_id: validated.meetingId,
        text: validated.text,
        rationale: validated.rationale,
        source_id: validated.sourceId,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Error adding meeting decision:", dbError);
      return error("DB_ERROR", "Failed to add decision");
    }

    revalidatePath(`/meetings/${validated.meetingId}`);
    return success({ id: data.id });
  } catch (err) {
    console.error("Unexpected error in addMeetingDecision:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}

// ============================================================================
// Meeting Action Items
// ============================================================================

export async function addMeetingActionItem(
  input: AddMeetingActionItemInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = AddMeetingActionItemSchema.parse(input);

    if (!(await verifyMeetingAccess(supabase, workspace.id, validated.meetingId))) {
      return error("NOT_FOUND", "Meeting not found");
    }

    const { data, error: dbError } = await supabase
      .from("meeting_action_items")
      .insert({
        workspace_id: workspace.id,
        meeting_id: validated.meetingId,
        text: validated.text,
        assignee: validated.assignee,
        assignee_person_id: validated.assigneePersonId,
        due_date: validated.dueDate,
        priority: validated.priority,
        context: validated.context,
        source_id: validated.sourceId,
        completed: false,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Error adding meeting action item:", dbError);
      return error("DB_ERROR", "Failed to add action item");
    }

    revalidatePath(`/meetings/${validated.meetingId}`);
    return success({ id: data.id });
  } catch (err) {
    console.error("Unexpected error in addMeetingActionItem:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}

export async function toggleMeetingActionItem(
  input: ToggleMeetingActionItemInput,
): Promise<ActionResponse<{ completed: boolean }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = ToggleMeetingActionItemSchema.parse(input);

    const { data, error: dbError } = await supabase
      .from("meeting_action_items")
      .update({
        completed: validated.completed,
        completed_at: validated.completed ? new Date().toISOString() : null,
      })
      .eq("id", validated.actionItemId)
      .eq("workspace_id", workspace.id)
      .select("id, meeting_id")
      .single();

    if (dbError) {
      console.error("Error toggling action item:", dbError);
      return error("DB_ERROR", "Failed to update action item");
    }

    if (!data) {
      return error("NOT_FOUND", "Action item not found");
    }

    revalidatePath(`/meetings/${data.meeting_id}`);
    return success({ completed: validated.completed });
  } catch (err) {
    console.error("Unexpected error in toggleMeetingActionItem:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}

// ============================================================================
// Meeting Transcripts
// ============================================================================

export async function attachMeetingTranscript(
  input: AttachMeetingTranscriptInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const validated = AttachMeetingTranscriptSchema.parse(input);

    if (!(await verifyMeetingAccess(supabase, workspace.id, validated.meetingId))) {
      return error("NOT_FOUND", "Meeting not found");
    }

    const { data, error: dbError } = await supabase
      .from("meeting_transcripts")
      .insert({
        workspace_id: workspace.id,
        meeting_id: validated.meetingId,
        content: validated.content,
        segments: validated.segments,
        duration_seconds: validated.durationSeconds,
        recording_url: validated.recordingUrl,
        source_id: validated.sourceId,
        status: "completed",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Error attaching transcript:", dbError);
      return error("DB_ERROR", "Failed to attach transcript");
    }

    revalidatePath(`/meetings/${validated.meetingId}`);
    return success({ id: data.id });
  } catch (err) {
    console.error("Unexpected error in attachMeetingTranscript:", err);
    return error("UNEXPECTED", "An unexpected error occurred");
  }
}
