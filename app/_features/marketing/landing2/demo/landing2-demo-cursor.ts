export type CursorPosition = { x: number; y: number };

/** Tip of the pointer SVG in Landing2DemoCursor (viewBox 0 0 24 28). */
export const DEMO_CURSOR_HOTSPOT = { x: 5.5, y: 3.2 };

/** Touch-point center in Landing2DemoTap (40px dot). */
export const DEMO_TAP_HOTSPOT = { x: 20, y: 20 };

export function measureDemoButtonTarget(
  layer: HTMLElement,
  el: HTMLElement,
  logicalWidth = 1600,
  hotspot = DEMO_CURSOR_HOTSPOT,
): CursorPosition {
  const layerRect = layer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scaleFactor = logicalWidth / layerRect.width;
  return {
    x:
      (elRect.left - layerRect.left + elRect.width / 2) * scaleFactor -
      hotspot.x,
    y:
      (elRect.top - layerRect.top + elRect.height / 2) * scaleFactor -
      hotspot.y,
  };
}

export function measureDemoTapTarget(
  layer: HTMLElement,
  el: HTMLElement,
  logicalWidth = 390,
): CursorPosition {
  return measureDemoButtonTarget(layer, el, logicalWidth, DEMO_TAP_HOTSPOT);
}
