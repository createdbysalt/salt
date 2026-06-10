/**
 * File Summarizer
 *
 * AI-powered file content summarization using GPT-4.
 * Supports text files, markdown, and images (via Vision).
 *
 * Usage:
 *   import { generateFileSummary } from '@/app/_lib/ai/file-summarizer'
 *
 *   const result = await generateFileSummary({
 *     fileUrl: signedUrl,
 *     fileName: 'document.md',
 *     mimeType: 'text/markdown',
 *     userId: 'user-123'
 *   })
 */

import "server-only";

import { resolveModel } from "./models";
import {
  buildUntrustedContentSystemPrompt,
  wrapUntrustedUserContent,
} from "./safety";

// =============================================================================
// Configuration
// =============================================================================

function getLlmApiConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const apiKey = openRouterKey || process.env.OPENAI_API_KEY;
  const baseUrl = (
    openRouterKey
      ? (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1")
      : (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1")
  ).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

const MAX_TEXT_LENGTH = 50000; // Truncate very long files
const AI_MODEL = resolveModel("summarization");

// =============================================================================
// Types
// =============================================================================

export interface FileSummaryInput {
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  userId: string;
  isLink?: boolean;
  externalUrl?: string;
}

export interface FileSummaryResult {
  success: true;
  summary: string;
  keyPoints: string[];
  fileTypeDetected: string;
  model: string;
  generatedAt: Date;
}

export interface FileSummaryError {
  success: false;
  error: string;
  code: "UNSUPPORTED_TYPE" | "EXTRACTION_FAILED" | "API_ERROR" | "NOT_CONFIGURED";
  retryable: boolean;
}

export type FileSummaryOutput = FileSummaryResult | FileSummaryError;

// =============================================================================
// Supported MIME Types
// =============================================================================

const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
];

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// These are currently unsupported (would need pdf-parse, mammoth, etc.)
const UNSUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Link MIME types (external URLs)
const LINK_MIME_TYPES = [
  "video/youtube",
  "video/vimeo",
  "video/loom",
  "application/figma",
  "application/sketch",
  "application/canva",
  "application/google-drive",
  "application/dropbox",
  "application/onedrive",
  "application/notion",
  "application/miro",
  "application/github",
  "application/gitlab",
  "application/link",
];

// =============================================================================
// System Prompts
// =============================================================================

const TEXT_SUMMARY_PROMPT = `You are a professional document analyst. Your task is to analyze the provided file content and create a concise summary.

Your summary must be:
- 2-3 sentences covering the main content/purpose
- Accurate and based only on the actual content
- Professional and clear

Also extract 3-5 key points from the content.

Output Format (JSON):
{
  "summary": "2-3 sentence summary of the file content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "fileTypeDetected": "document type (e.g., 'README file', 'CSV data', 'Configuration file')"
}

Important:
- Return ONLY valid JSON, no markdown formatting
- If the content is very short or trivial, still provide a summary
- For CSV/data files, describe the data structure and purpose`;

const IMAGE_SUMMARY_PROMPT = `You are a professional image analyst. Your task is to analyze the provided image and create a concise description.

Your description must be:
- 2-3 sentences covering what the image shows
- Accurate and descriptive
- Professional and clear

Also extract 3-5 key observations about the image.

Output Format (JSON):
{
  "summary": "2-3 sentence description of the image",
  "keyPoints": ["Observation 1", "Observation 2", "Observation 3"],
  "fileTypeDetected": "image type (e.g., 'Logo', 'Screenshot', 'Photo', 'Diagram', 'Brand asset')"
}

Important:
- Return ONLY valid JSON, no markdown formatting
- Focus on what's relevant for a business context (logos, brand colors, UI screenshots, etc.)
- If it's a logo, describe the design, colors, and style`;

const LINK_SUMMARY_PROMPT = `You are a professional resource analyst. Your task is to analyze the provided external link and create a helpful description based on the URL and link name.

Your description must be:
- 2-3 sentences explaining what this resource likely contains/provides
- Based on the URL structure, domain, and link name
- Professional and helpful for someone managing client files

Also extract 3-5 key observations about the resource.

Output Format (JSON):
{
  "summary": "2-3 sentence description of what this link provides",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "fileTypeDetected": "resource type (e.g., 'Figma design file', 'YouTube video', 'Google Doc', 'GitHub repository', 'Notion page')"
}

Important:
- Return ONLY valid JSON, no markdown formatting
- Be specific about the platform (Figma, YouTube, Notion, etc.)
- Infer purpose from URL path segments and query parameters when possible
- If it's a video, note that it's a video resource
- If it's a design tool, mention that it's a design asset`;

const TEXT_SUMMARY_SYSTEM = buildUntrustedContentSystemPrompt(TEXT_SUMMARY_PROMPT);
const IMAGE_SUMMARY_SYSTEM = buildUntrustedContentSystemPrompt(IMAGE_SUMMARY_PROMPT);
const LINK_SUMMARY_SYSTEM = buildUntrustedContentSystemPrompt(LINK_SUMMARY_PROMPT);

// =============================================================================
// Helper Functions
// =============================================================================

function isTextFile(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return TEXT_MIME_TYPES.includes(mimeType);
}

function isImageFile(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return IMAGE_MIME_TYPES.includes(mimeType);
}

function isUnsupportedDocument(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return UNSUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

function isLinkType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return LINK_MIME_TYPES.includes(mimeType);
}

function truncateContent(content: string): string {
  if (content.length <= MAX_TEXT_LENGTH) {
    return content;
  }
  const truncated = content.substring(0, MAX_TEXT_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return (
    truncated.substring(0, lastSpace > 0 ? lastSpace : MAX_TEXT_LENGTH) +
    "\n\n[Content truncated due to length]"
  );
}

async function fetchTextContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch file:", response.status);
      return null;
    }
    const text = await response.text();
    return truncateContent(text);
  } catch (error) {
    console.error("Error fetching file content:", error);
    return null;
  }
}

// =============================================================================
// OpenAI API Calls
// =============================================================================

interface GPTSummaryResponse {
  summary: string;
  keyPoints: string[];
  fileTypeDetected: string;
}

async function summarizeText(
  content: string,
  fileName: string,
  userId: string
): Promise<GPTSummaryResponse | null> {
  try {
    const { apiKey, baseUrl } = getLlmApiConfig();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: TEXT_SUMMARY_SYSTEM },
          {
            role: "user",
            content: wrapUntrustedUserContent(
              "FILE_CONTENT",
              `File: ${fileName}\n\nContent:\n${content}`,
            ),
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        user: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return null;
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return null;
    }

    // Parse JSON response
    let cleanJson = responseContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanJson) as GPTSummaryResponse;
  } catch (error) {
    console.error("Error calling OpenAI for text:", error);
    return null;
  }
}

async function summarizeLink(
  externalUrl: string,
  linkName: string,
  mimeType: string | null,
  userId: string
): Promise<GPTSummaryResponse | null> {
  try {
    const { apiKey, baseUrl } = getLlmApiConfig();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: LINK_SUMMARY_SYSTEM },
          {
            role: "user",
            content: wrapUntrustedUserContent(
              "LINK_METADATA",
              `Link Name: ${linkName}\nURL: ${externalUrl}\nDetected Type: ${mimeType || "unknown"}`,
            ),
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        user: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return null;
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return null;
    }

    // Parse JSON response
    let cleanJson = responseContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanJson) as GPTSummaryResponse;
  } catch (error) {
    console.error("Error calling OpenAI for link:", error);
    return null;
  }
}

async function summarizeImage(
  imageUrl: string,
  fileName: string,
  userId: string
): Promise<GPTSummaryResponse | null> {
  try {
    const { apiKey, baseUrl } = getLlmApiConfig();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: IMAGE_SUMMARY_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: wrapUntrustedUserContent(
                  "IMAGE_METADATA",
                  `Analyze this image (filename: ${fileName}):`,
                ),
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        user: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Vision API error:", error);
      return null;
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return null;
    }

    // Parse JSON response
    let cleanJson = responseContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanJson) as GPTSummaryResponse;
  } catch (error) {
    console.error("Error calling OpenAI Vision:", error);
    return null;
  }
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Generate an AI summary for a file.
 *
 * Supports:
 * - Text files (txt, md, csv)
 * - Images (jpg, png, gif, webp) via GPT-4 Vision
 *
 * @param input - File URL, name, MIME type, and user ID
 * @returns Summary result or error
 */
export async function generateFileSummary(
  input: FileSummaryInput
): Promise<FileSummaryOutput> {
  const { fileUrl, fileName, mimeType, userId, isLink, externalUrl } = input;

  // Check if API is configured
  const { apiKey } = getLlmApiConfig();
  if (!apiKey) {
    return {
      success: false,
      error: "OpenAI API key not configured",
      code: "NOT_CONFIGURED",
      retryable: false,
    };
  }

  // Handle links (external URLs)
  // Check both explicit isLink flag AND link MIME types (for backwards compatibility)
  const isLinkMimeType = isLinkType(mimeType);
  if ((isLink || isLinkMimeType) && externalUrl) {
    const result = await summarizeLink(externalUrl, fileName, mimeType, userId);
    if (!result) {
      return {
        success: false,
        error: "AI link analysis failed",
        code: "API_ERROR",
        retryable: true,
      };
    }

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
      fileTypeDetected: result.fileTypeDetected,
      model: AI_MODEL,
      generatedAt: new Date(),
    };
  }

  // Handle unsupported document types
  if (isUnsupportedDocument(mimeType)) {
    return {
      success: false,
      error: `PDF and Office documents are not yet supported for AI summarization`,
      code: "UNSUPPORTED_TYPE",
      retryable: false,
    };
  }

  // Handle text files
  if (isTextFile(mimeType)) {
    const content = await fetchTextContent(fileUrl);
    if (!content) {
      return {
        success: false,
        error: "Failed to read file content",
        code: "EXTRACTION_FAILED",
        retryable: true,
      };
    }

    const result = await summarizeText(content, fileName, userId);
    if (!result) {
      return {
        success: false,
        error: "AI processing failed",
        code: "API_ERROR",
        retryable: true,
      };
    }

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
      fileTypeDetected: result.fileTypeDetected,
      model: AI_MODEL,
      generatedAt: new Date(),
    };
  }

  // Handle images via Vision
  if (isImageFile(mimeType)) {
    const result = await summarizeImage(fileUrl, fileName, userId);
    if (!result) {
      return {
        success: false,
        error: "AI image analysis failed",
        code: "API_ERROR",
        retryable: true,
      };
    }

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
      fileTypeDetected: result.fileTypeDetected,
      model: AI_MODEL,
      generatedAt: new Date(),
    };
  }

  // Unknown or unsupported type
  return {
    success: false,
    error: `File type '${mimeType || "unknown"}' is not supported for AI summarization`,
    code: "UNSUPPORTED_TYPE",
    retryable: false,
  };
}

/**
 * Check if AI summarization is available for a given MIME type.
 */
export function isSummarizationSupported(mimeType: string | null, isLink?: boolean): boolean {
  if (isLink) return true; // All links are supported
  if (!mimeType) return false;
  return isTextFile(mimeType) || isImageFile(mimeType) || isLinkType(mimeType);
}

/**
 * Check if the AI summary service is configured.
 */
export function isSummaryConfigured(): boolean {
  const { apiKey } = getLlmApiConfig();
  return !!apiKey;
}
