import * as React from "react";

/** Prevents background scroll while overlays (mobile nav, fullscreen panels) are open. */
export function useBodyScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
