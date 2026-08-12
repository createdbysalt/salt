"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import {
  generateFileSummary as generateSummary,
  isSummarizationSupported,
} from "@/app/_lib/ai/file-summarizer";
import { analyzeResourceContent } from "@/app/_features/resources/services/content-analysis";

// =============================================================================
// Types
// =============================================================================

export interface GenerateFileSummaryResult {
  success: boolean;
  error?: string;
  summary?: string;
  keyPoints?: string[];
}

// =============================================================================
// Generate AI Summary for a File
// =============================================================================

/**
 * Generate an AI summary for a file.
 * Updates the file record with the summary status and result.
 */
export async function generateFileSummary(
  fileId: string
): Promise<GenerateFileSummaryResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get file details
    const { data: file, error: fetchError } = await supabase
      .from("resources")
      .select("id, object_path, bucket_id, file_name, mime_type, person_id, file_type, external_url")
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !file) {
      console.error("Error fetching file:", fetchError);
      return { success: false, error: "File not found" };
    }

    const isLink = file.file_type === "link";

    // Check if file type is supported
    if (!isSummarizationSupported(file.mime_type, isLink)) {
      // Update status to unsupported
      await supabase
        .from("resources")
        .update({
          ai_status: "unsupported",
          ai_error: `File type '${file.mime_type || "unknown"}' is not supported for AI summarization`,
        })
        .eq("id", fileId);

      return {
        success: false,
        error: "This file type is not supported for AI summarization",
      };
    }

    // Update status to processing
    await supabase
      .from("resources")
      .update({ ai_status: "processing", ai_error: null })
      .eq("id", fileId);

    let fileUrl: string;

    // For links, use the external URL directly
    if (isLink && file.external_url) {
      fileUrl = file.external_url;
    } else {
      // For files, create signed URL (valid for 1 hour)
      const { data: urlData, error: urlError } = await supabase.storage
        .from(file.bucket_id)
        .createSignedUrl(file.object_path, 3600);

      if (urlError || !urlData?.signedUrl) {
        console.error("Error creating signed URL:", urlError);
        await supabase
          .from("resources")
          .update({
            ai_status: "failed",
            ai_error: "Failed to access file",
          })
          .eq("id", fileId);

        return { success: false, error: "Failed to access file" };
      }
      fileUrl = urlData.signedUrl;
    }

    // Generate AI summary
    console.log("[AI Summary] Generating for:", {
      fileName: file.file_name,
      mimeType: file.mime_type,
      isLink,
      hasExternalUrl: !!file.external_url,
    });

    const result = await generateSummary({
      fileUrl,
      fileName: file.file_name,
      mimeType: file.mime_type,
      userId: user.id,
      isLink,
      externalUrl: file.external_url || undefined,
    });

    console.log("[AI Summary] Result:", result.success ? "success" : result.error);

    if (!result.success) {
      // Update status to failed or unsupported
      const status = result.code === "UNSUPPORTED_TYPE" ? "unsupported" : "failed";
      await supabase
        .from("resources")
        .update({
          ai_status: status,
          ai_error: result.error,
        })
        .eq("id", fileId);

      return { success: false, error: result.error };
    }

    // Update with successful summary
    const summaryText = result.keyPoints.length > 0
      ? `${result.summary}\n\n**Key Points:**\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}`
      : result.summary;

    await supabase
      .from("resources")
      .update({
        ai_status: "completed",
        ai_summary: summaryText,
        ai_extracted_at: new Date().toISOString(),
        ai_error: null,
      })
      .eq("id", fileId);

    // Revalidate the client page
    if (file.person_id) revalidatePath(`/people/${file.person_id}`);

    // The fresh summary gives the content-analysis pass text to work with on
    // links and stubs (uploads already ran it against the file itself).
    analyzeResourceContent({
      workspaceId: workspace.id,
      resourceId: fileId,
      actorUserId: user.id,
    }).catch((err) => {
      console.error("Error analyzing resource content after summary:", err);
    });

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
    };
  } catch (error) {
    console.error("Error in generateFileSummary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Get File AI Status
// =============================================================================

export interface FileAIStatus {
  status: "pending" | "processing" | "completed" | "failed" | "unsupported";
  summary: string | null;
  error: string | null;
  extractedAt: string | null;
}

/**
 * Get the AI summary status for a file.
 */
export async function getFileAIStatus(fileId: string): Promise<FileAIStatus | null> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("resources")
      .select("ai_status, ai_summary, ai_error, ai_extracted_at")
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      status: data.ai_status || "pending",
      summary: data.ai_summary,
      error: data.ai_error,
      extractedAt: data.ai_extracted_at,
    };
  } catch (error) {
    console.error("Error in getFileAIStatus:", error);
    return null;
  }
}
