export type CursorPosition = { x: number; y: number };

export function isFiniteCursorPosition(pos: CursorPosition | null | undefined): pos is CursorPosition {
  return pos != null && Number.isFinite(pos.x) && Number.isFinite(pos.y);
}

/** Tip of the pointer SVG in Landing2DemoCursor (viewBox 0 0 24 28). */
export const DEMO_CURSOR_HOTSPOT = { x: 5.5, y: 3.2 };

/** Touch-point center in Landing2DemoTap (40px dot). */
export const DEMO_TAP_HOTSPOT = { x: 20, y: 20 };

export function measureDemoButtonTarget(
  layer: HTMLElement,
  el: HTMLElement,
  logicalWidth = 1600,
  hotspot = DEMO_CURSOR_HOTSPOT,
): CursorPosition | null {
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width <= 0 || layerRect.height <= 0) return null;

  const elRect = el.getBoundingClientRect();
  const scaleFactor = logicalWidth / layerRect.width;
  const x =
    (elRect.left - layerRect.left + elRect.width / 2) * scaleFactor - hotspot.x;
  const y =
    (elRect.top - layerRect.top + elRect.height / 2) * scaleFactor - hotspot.y;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x, y };
}

export function measureDemoTapTarget(
  layer: HTMLElement,
  el: HTMLElement,
  logicalWidth = 390,
): CursorPosition | null {
  return measureDemoButtonTarget(layer, el, logicalWidth, DEMO_TAP_HOTSPOT);
}
