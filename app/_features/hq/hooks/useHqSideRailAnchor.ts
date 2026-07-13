"use client";

import { useLayoutEffect, useState } from "react";

export const HQ_SIDE_RAIL_ANCHOR_ID = "hq-side-rail-anchor";

type SideRailAnchorRect = {
  left: number;
  width: number;
};

function useIsLgUp() {
  const [isLg, setIsLg] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isLg;
}

export function useHqSideRailAnchor(enabled: boolean): SideRailAnchorRect | null {
  const isLg = useIsLgUp();
  const [rect, setRect] = useState<SideRailAnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !isLg) {
      setRect(null);
      return;
    }

    const anchor = document.getElementById(HQ_SIDE_RAIL_ANCHOR_ID);
    if (!anchor) return;

    const update = () => {
      const next = anchor.getBoundingClientRect();
      setRect({
        left: next.left,
        width: next.width,
      });
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(anchor);

    const main = anchor.closest("main");
    if (main) resizeObserver.observe(main);

    window.addEventListener("resize", update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [enabled, isLg]);

  return rect;
}
