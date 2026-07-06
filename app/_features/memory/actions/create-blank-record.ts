"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { createOrganization, createPerson } from "@/app/_features/relationships/entity-actions";
import { ensureUniqueProjectSlug } from "@/app/_features/capture/services/system-plays/project-fields";
import { createClientLink } from "@/app/_features/people/actions/files/upload-client-file";
import { createBillingRecordAction } from "@/app/_features/billing/actions/create-billing-record";
import { buildBlankBillingDraft } from "@/app/_features/billing/utils/blank-draft";
import { PLACEHOLDER_FILE_URL } from "@/app/_features/memory/utils/record-name";
import type { BillingDirection } from "@/app/_features/billing/data";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";

type CreateBlankRecordResult =
  | { ok: true; data: { id: string; href: string } }
  | { ok: false; message: string };

function roundUpToNextHour(date: Date): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export async function createBlankPersonAction(): Promise<CreateBlankRecordResult> {
  const result = await createPerson({ name: "Untitled" });
  if (!result.success || !result.data) {
    return { ok: false, message: result.error ?? "Could not create person" };
  }

  revalidatePath("/people");
  revalidatePath(`/people/${result.data.id}`);

  return { ok: true, data: { id: result.data.id, href: `/people/${result.data.id}` } };
}

export async function createBlankOrgAction(): Promise<CreateBlankRecordResult> {
  const result = await createOrganization({ name: "Untitled organization" });
  if (!result.success || !result.data) {
    return { ok: false, message: result.error ?? "Could not create organization" };
  }

  revalidatePath("/orgs");
  revalidatePath(`/orgs/${result.data.id}`);

  return { ok: true, data: { id: result.data.id, href: `/orgs/${result.data.id}` } };
}

export async function createBlankWorkAction(): Promise<CreateBlankRecordResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();
    const admin = createAdminClient();
    const name = "Untitled work";

    const slug = await ensureUniqueProjectSlug(admin, workspace.id, name);

    const { data, error } = await supabase
      .from("work")
      .insert({
        workspace_id: workspace.id,
        name,
        slug,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, message: error?.message ?? "Could not create work item" };
    }

    scheduleWorkHealthRecompute(data.id);
    revalidatePath("/work");
    revalidatePath(`/work/${data.id}`);

    return { ok: true, data: { id: data.id, href: `/work/${data.id}` } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create work item",
    };
  }
}

export async function createBlankMeetingAction(): Promise<CreateBlankRecordResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const startTime = roundUpToNextHour(new Date());
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        workspace_id: workspace.id,
        title: "Untitled meeting",
        meeting_type: "other",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location_type: "google-meet",
        status: "scheduled",
        visibility: "internal",
        origin: "internal",
        attendees: [],
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, message: error?.message ?? "Could not create meeting" };
    }

    revalidatePath("/meetings");
    revalidatePath(`/meetings/${data.id}`);

    return { ok: true, data: { id: data.id, href: `/meetings/${data.id}` } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create meeting",
    };
  }
}

export async function createBlankFileAction(): Promise<CreateBlankRecordResult> {
  try {
    await getWorkspaceContext();

    const result = await createClientLink({
      name: "Untitled file",
      url: PLACEHOLDER_FILE_URL,
      category: "other",
      description: "Add a link or replace this placeholder URL.",
    });

    if (!result.success || !result.fileId) {
      return { ok: false, message: result.error ?? "Could not create file" };
    }

    revalidatePath("/files");

    return {
      ok: true,
      data: { id: result.fileId, href: `/files?preview=${result.fileId}` },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create file",
    };
  }
}

export async function createBlankBillingRecordAction(
  direction: BillingDirection,
): Promise<CreateBlankRecordResult> {
  const result = await createBillingRecordAction(buildBlankBillingDraft(direction));
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true, data: { id: result.data.id, href: result.data.href } };
}
