import type { BillingRecord } from "../data";
import { isBillingUuid } from "./db-mapper";

const ACTIVE_PLAY_TARGETS = [
  "organization",
  "person",
  "project",
] as const satisfies readonly string[];

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function normalizeBillingPlaySearchTerm(partyLabel: string): string | null {
  const firstWord = partyLabel.trim().split(/\s+/)[0];
  if (!firstWord) return null;

  const normalized = firstWord.replace(/[^\p{L}\p{N}]/gu, "");
  return normalized.length > 0 ? normalized : null;
}

export function buildBillingPlayOrFilter(
  record: BillingRecord,
  partyLabel: string,
): string | null {
  const filters: string[] = [];

  if (isBillingUuid(record.org?.id)) {
    filters.push(`and(target_type.eq.${ACTIVE_PLAY_TARGETS[0]},target_id.eq.${record.org.id})`);
  }
  if (isBillingUuid(record.billTo?.id)) {
    filters.push(`and(target_type.eq.${ACTIVE_PLAY_TARGETS[1]},target_id.eq.${record.billTo.id})`);
  }
  if (isBillingUuid(record.payTo?.id)) {
    filters.push(`and(target_type.eq.${ACTIVE_PLAY_TARGETS[1]},target_id.eq.${record.payTo.id})`);
  }
  if (isBillingUuid(record.work?.id)) {
    filters.push(`and(target_type.eq.${ACTIVE_PLAY_TARGETS[2]},target_id.eq.${record.work.id})`);
  }

  const searchTerm = normalizeBillingPlaySearchTerm(partyLabel);
  if (searchTerm) {
    filters.push(`recipient_label.ilike.%${escapeIlikePattern(searchTerm)}%`);
  }

  return filters.length > 0 ? filters.join(",") : null;
}
