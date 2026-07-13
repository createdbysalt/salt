/**
 * Voice Profiles Module
 *
 * Manages voice profiles for playbook content generation.
 * Salt-provided voices (billing, follow-up, brief) are available to all workspaces.
 * Custom voices are workspace-scoped.
 *
 * Usage:
 *   import { getVoices, createVoice } from "@/app/_features/me/voices";
 */

export * from "./queries";
export * from "./actions";
