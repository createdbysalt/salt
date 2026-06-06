"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Measures container width and returns scale for a fixed logical canvas width. */
export function useDemoCanvasScale(logicalWidth: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);

  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const width = el.clientWidth;
      if (width <= 0) return;
      setScale(width / logicalWidth);
    },
    [logicalWidth],
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      measure(node);
    },
    [measure],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    measure(el);
    const ro = new ResizeObserver(() => measure(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return {
    containerRef: setContainerRef,
    scale,
    demoReady: scale !== null && scale > 0,
  };
}
