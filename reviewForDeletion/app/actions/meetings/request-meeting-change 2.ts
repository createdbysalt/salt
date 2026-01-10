"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { z } from "zod";

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
  request_type: z.enum(["reschedule", "cancel"]),
  reason: z.string().min(1).max(500),
  proposed_time: z.string().datetime().optional(),
});

/**
 * Client-side action: Request a meeting reschedule or cancellation.
 * Creates a task with source='client_request' so studio can handle it.
 */
export async function requestMeetingChange(data: z.infer<typeof requestSchema>) {
  try {
    const { context } = await getTenantContext();
    
    if (!context.client) {
      return { error: "Client access required" };
    }

    const supabase = await createClient();

    // Validate input
    const validatedData = requestSchema.parse(data);

    // Verify meeting belongs to this client
    const { data: meeting } = await supabase
      .from("client_meetings")
      .select("id, title, client_id, studio_id, start_time")
      .eq("id", validatedData.meeting_id)
      .eq("client_id", context.client.id)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Create a client_request task
    const taskTitle = validatedData.request_type === "reschedule"
      ? `Reschedule Request: ${meeting.title}`
      : `Cancellation Request: ${meeting.title}`;

    const taskDescription = validatedData.proposed_time
      ? `${validatedData.reason}\n\nProposed new time: ${new Date(validatedData.proposed_time).toLocaleString()}`
      : validatedData.reason;

    const { error: taskError } = await supabase
      .from("tasks")
      .insert({
        studio_id: meeting.studio_id,
        client_id: meeting.client_id,
        title: taskTitle,
        description: taskDescription,
        source: "client_request",
        priority: "high",
        status: "open",
        metadata: {
          meeting_id: meeting.id,
          request_type: validatedData.request_type,
          proposed_time: validatedData.proposed_time,
        },
      });

    if (taskError) {
      console.error("Error creating request task:", taskError);
      return { error: "Failed to submit request" };
    }

    return { success: true, message: "Your request has been submitted to the studio" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

