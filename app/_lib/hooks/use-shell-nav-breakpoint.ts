import * as React from "react";
import { SHELL_NAV_BREAKPOINT_PX } from "@/app/_features/shell/constants";

const QUERY = `(max-width: ${SHELL_NAV_BREAKPOINT_PX - 1}px)`;

/** True below the shell nav breakpoint — persistent sidebar hidden, hamburger + drawer used. */
export function useShellNavMobile() {
  const [isMobileNav, setIsMobileNav] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setIsMobileNav(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobileNav;
}
