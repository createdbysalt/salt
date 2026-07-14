/**
 * Email Urgency Detection
 *
 * Detects urgency level from email content using keyword patterns.
 * Returns urgency level and matched markers for evidence.
 */

import type { UrgencyLevel } from "./types";
import { URGENCY_KEYWORDS, DEADLINE_PATTERNS } from "./types";

export interface UrgencyResult {
  level: UrgencyLevel;
  markers: string[];
}

export function detectUrgency(subject: string, bodyPreview: string): UrgencyResult {
  const content = `${subject} ${bodyPreview}`.toLowerCase();
  const markers: string[] = [];
  let level: UrgencyLevel = "none";

  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (content.includes(keyword)) {
      markers.push(keyword);
      level = "critical";
    }
  }

  if (level === "none") {
    for (const keyword of URGENCY_KEYWORDS.high) {
      if (content.includes(keyword)) {
        markers.push(keyword);
        level = "high";
      }
    }
  }

  if (level === "none") {
    for (const keyword of URGENCY_KEYWORDS.medium) {
      if (content.includes(keyword)) {
        markers.push(keyword);
        level = "medium";
      }
    }
  }

  if (level === "none") {
    for (const keyword of URGENCY_KEYWORDS.low) {
      if (content.includes(keyword)) {
        markers.push(keyword);
        level = "low";
      }
    }
  }

  const hasDeadline = DEADLINE_PATTERNS.some((p) => p.test(content));
  if (hasDeadline) {
    markers.push("deadline_mentioned");
    if (level === "none") {
      level = "medium";
    } else if (level === "low") {
      level = "medium";
    }
  }

  return { level, markers };
}
