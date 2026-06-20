"use client";

import type { ComponentType } from "react";
import {
  CapabilityIntelligenceVisual,
  CapabilityPlaybooksVisual,
  CapabilityPlaysVisual,
  CaptureMemoryVisual,
  ConnectToolsPickVisual,
  TodayBriefVisual,
} from "./Landing2VisualMocks";

export const CAPABILITY_VISUAL_KEYS = [
  "integrations",
  "capture-memory",
  "morning-brief",
  "plays",
  "intelligence",
  "playbooks",
] as const;

export type CapabilityVisualKey = (typeof CAPABILITY_VISUAL_KEYS)[number];

export const CAPABILITY_VISUALS: Record<CapabilityVisualKey, ComponentType> = {
  integrations: ConnectToolsPickVisual,
  "capture-memory": CaptureMemoryVisual,
  "morning-brief": TodayBriefVisual,
  plays: CapabilityPlaysVisual,
  intelligence: CapabilityIntelligenceVisual,
  playbooks: CapabilityPlaybooksVisual,
};

export function isCapabilityVisualKey(value: string): value is CapabilityVisualKey {
  return (CAPABILITY_VISUAL_KEYS as readonly string[]).includes(value);
}
