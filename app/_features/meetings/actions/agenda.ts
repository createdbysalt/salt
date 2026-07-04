"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { AgendaItem, AgendaMode } from "../utils/agenda-templates";
import { getAgendaTemplate, createEmptyAgendaItem } from "../utils/agenda-templates";

type AgendaResult = { success: true; agenda: AgendaItem[] } | { success: false; error: string };

async function getMeetingAgenda(meetingId: string): Promise<AgendaItem[] | null> {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("meetings")
    .select("agenda")
    .eq("id", meetingId)
    .eq("workspace_id", workspace.id)
    .single();

  if (error) throw new Error(error.message);
  return data?.agenda as AgendaItem[] | null;
}

async function updateMeetingAgenda(meetingId: string, agenda: AgendaItem[] | null): Promise<void> {
  const { workspace, supabase } = await getWorkspaceContext();

  const { error } = await supabase
    .from("meetings")
    .update({ agenda })
    .eq("id", meetingId)
    .eq("workspace_id", workspace.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function initializeAgenda(
  meetingId: string,
  mode: AgendaMode,
  meetingType?: string | null
): Promise<AgendaResult> {
  try {
    let agenda: AgendaItem[];

    switch (mode) {
      case "template":
        agenda = getAgendaTemplate(meetingType);
        break;
      case "custom":
        agenda = [createEmptyAgendaItem(0)];
        break;
      case "none":
        agenda = [];
        break;
    }

    await updateMeetingAgenda(meetingId, agenda);
    return { success: true, agenda };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to initialize agenda" };
  }
}

export async function addAgendaItem(
  meetingId: string,
  title: string = ""
): Promise<AgendaResult> {
  try {
    const current = await getMeetingAgenda(meetingId);
    const items = current ?? [];
    const newItem = createEmptyAgendaItem(items.length);
    newItem.title = title;

    const updated = [...items, newItem];
    await updateMeetingAgenda(meetingId, updated);
    return { success: true, agenda: updated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add agenda item" };
  }
}

export async function updateAgendaItem(
  meetingId: string,
  itemId: string,
  updates: { title?: string; notes?: string }
): Promise<AgendaResult> {
  try {
    const current = await getMeetingAgenda(meetingId);
    if (!current) {
      return { success: false, error: "No agenda found" };
    }

    const updated = current.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    await updateMeetingAgenda(meetingId, updated);
    return { success: true, agenda: updated };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update agenda item" };
  }
}

export async function removeAgendaItem(
  meetingId: string,
  itemId: string
): Promise<AgendaResult> {
  try {
    const current = await getMeetingAgenda(meetingId);
    if (!current) {
      return { success: false, error: "No agenda found" };
    }

    const filtered = current.filter((item) => item.id !== itemId);
    const reordered = filtered.map((item, index) => ({ ...item, order: index }));

    await updateMeetingAgenda(meetingId, reordered);
    return { success: true, agenda: reordered };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove agenda item" };
  }
}

export async function reorderAgendaItems(
  meetingId: string,
  itemIds: string[]
): Promise<AgendaResult> {
  try {
    const current = await getMeetingAgenda(meetingId);
    if (!current) {
      return { success: false, error: "No agenda found" };
    }

    const itemMap = new Map(current.map((item) => [item.id, item]));
    const reordered = itemIds
      .map((id, index) => {
        const item = itemMap.get(id);
        return item ? { ...item, order: index } : null;
      })
      .filter((item): item is AgendaItem => item !== null);

    await updateMeetingAgenda(meetingId, reordered);
    return { success: true, agenda: reordered };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder agenda" };
  }
}

export async function resetAgendaToTemplate(
  meetingId: string,
  meetingType?: string | null
): Promise<AgendaResult> {
  try {
    const agenda = getAgendaTemplate(meetingType);
    await updateMeetingAgenda(meetingId, agenda);
    return { success: true, agenda };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reset agenda" };
  }
}

export async function clearAgenda(meetingId: string): Promise<AgendaResult> {
  try {
    await updateMeetingAgenda(meetingId, []);
    return { success: true, agenda: [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to clear agenda" };
  }
}
