import type { CursorPosition } from "./useWorkspaceDemoTimeline";

/** Tip of the pointer SVG in Landing2DemoCursor (viewBox 0 0 24 28). */
export const DEMO_CURSOR_HOTSPOT = { x: 5.5, y: 3.2 };

export function measureDemoButtonTarget(
  layer: HTMLElement,
  el: HTMLElement,
  logicalWidth = 1600,
): CursorPosition {
  const layerRect = layer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scaleFactor = logicalWidth / layerRect.width;
  return {
    x:
      (elRect.left - layerRect.left + elRect.width / 2) * scaleFactor -
      DEMO_CURSOR_HOTSPOT.x,
    y:
      (elRect.top - layerRect.top + elRect.height / 2) * scaleFactor -
      DEMO_CURSOR_HOTSPOT.y,
  };
}
