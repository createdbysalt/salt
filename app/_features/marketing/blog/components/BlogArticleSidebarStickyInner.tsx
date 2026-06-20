"use client";

import { useEffect, useRef, type ReactNode } from "react";

const STICKY_BOTTOM_OFFSET_PX = 64;

type BlogArticleSidebarStickyInnerProps = {
  children: ReactNode;
};

/** Pins Share + newsletter block bottom to viewport; author/TOC scroll normally. */
export function BlogArticleSidebarStickyInner({
  children,
}: BlogArticleSidebarStickyInnerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const syncStickyTop = () => {
      const height = node.offsetHeight;
      const top = Math.max(
        16,
        window.innerHeight - height - STICKY_BOTTOM_OFFSET_PX
      );
      node.style.setProperty("--blog-sidebar-sticky-top", `${top}px`);
    };

    syncStickyTop();

    const resizeObserver = new ResizeObserver(syncStickyTop);
    resizeObserver.observe(node);
    window.addEventListener("resize", syncStickyTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncStickyTop);
    };
  }, []);

  return (
    <div ref={ref} className="blog-article-sidebar__sticky">
      {children}
    </div>
  );
}
