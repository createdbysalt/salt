"use client";

import { Landing2HeroWorkspacePreview } from "./Landing2HeroWorkspacePreview";
import {
  resolveHeroPreviewVisualKey,
  type HeroPreviewVisualKey,
} from "./hero-preview-visuals";

type HeroPreviewVisualProps = {
  visualKey?: string | null;
};

export function HeroPreviewVisual({ visualKey }: HeroPreviewVisualProps) {
  const resolved = resolveHeroPreviewVisualKey(visualKey);

  switch (resolved) {
    case "workspace-demo":
      return <Landing2HeroWorkspacePreview />;
    default:
      return <Landing2HeroWorkspacePreview />;
  }
}

export type { HeroPreviewVisualKey };
