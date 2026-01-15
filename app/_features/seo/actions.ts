"use server";

/**
 * SEO Feature - Server Actions
 *
 * This module re-exports actions from the centralized SEO module.
 * Handles SEO configuration, audits, alerts, and client data.
 *
 * Usage:
 *   import { runAudit, getSeoOverview } from '@/app/_features/seo/actions'
 */

// Re-export everything from the SEO index
export * from "@/app/actions/seo";
