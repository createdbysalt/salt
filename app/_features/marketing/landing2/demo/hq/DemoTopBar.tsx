import type { Ref } from "react";
import { Search, MessageCircle, Sparkles, Command, Menu } from "lucide-react";
import { SALT_LOGO_PATH } from "../../constants";

export function TopBar({
  onAskSalt,
  onMenu,
  askActive,
  askSaltRef,
  demoMode,
}: {
  onAskSalt?: () => void;
  onMenu?: () => void;
  askActive?: boolean;
  askSaltRef?: Ref<HTMLButtonElement>;
  demoMode?: boolean;
}) {
  return (
    <div
      className={
        demoMode
          ? "topbar-shell sticky top-0 z-30 bg-background/75 px-10 py-4 backdrop-blur-xl border-b border-border/50"
          : "topbar-shell sticky top-0 z-30 bg-background/75 px-4 py-3 backdrop-blur-xl border-b border-border/50 lg:px-10 lg:py-4"
      }
    >
      <div className="max-w-[1400px] mx-auto flex items-center gap-3">
        {/* Mobile hamburger + brand */}
        <button
          onClick={onMenu}
          className={`${demoMode ? "hidden" : "md:hidden"} size-10 grid place-items-center rounded-xl hover:bg-muted transition shrink-0`}
          aria-label="Open menu"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <div className={`${demoMode ? "hidden" : "md:hidden"} flex items-center shrink-0`}>
          <span
            aria-label="Salt"
            role="img"
            className="block h-5 w-[40px] bg-foreground"
            style={{
              maskImage: `url(${SALT_LOGO_PATH})`,
              WebkitMaskImage: `url(${SALT_LOGO_PATH})`,
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
        </div>

        {/* Desktop search */}
        <div className={`${demoMode ? "block" : "hidden md:block"} relative group flex-1 min-w-0 max-w-2xl`}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            placeholder="Search or do anything"
            className="w-full h-11 pl-11 pr-20 rounded-2xl bg-muted/60 border border-border/80 hover:border-foreground/30 focus:bg-card focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5 text-sm transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-muted-foreground bg-card border border-border/60 rounded-md px-1.5 py-0.5 font-medium">
            <Command className="size-3" /> K
          </div>
        </div>

        {/* Mobile search icon */}
        <button className={`${demoMode ? "hidden" : "md:hidden"} ml-auto size-10 grid place-items-center rounded-xl hover:bg-muted transition`} aria-label="Search">
          <Search className="size-[18px]" strokeWidth={1.75} />
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-3 md:ml-auto shrink-0">
          <button className={`${demoMode ? "grid" : "hidden md:grid"} size-11 place-items-center rounded-2xl hover:bg-muted transition`} aria-label="Messages">
            <MessageCircle className="size-[18px]" strokeWidth={1.75} />
          </button>

          {/* Desktop Ask Salt pill */}
          <button
            ref={askSaltRef}
            onClick={onAskSalt}
            className={`${demoMode ? "flex" : "hidden md:flex"} group h-11 pl-3.5 pr-4 items-center gap-2 rounded-2xl text-sm font-medium text-foreground bg-card ring-soft hover-lift ${askActive ? "ring-2 ring-foreground/15" : ""}`}
          >
            <span className="size-5 rounded-full surface-aurora grid place-items-center">
              <Sparkles className="size-3 text-white relative z-10" strokeWidth={2.5} />
            </span>
            Ask Salt
          </button>

          {/* Mobile Ask Salt icon */}
          <button
            onClick={onAskSalt}
            className={`${demoMode ? "hidden" : "md:hidden"} size-10 grid place-items-center rounded-xl hover:bg-muted transition`}
            aria-label="Ask Salt"
          >
            <span className="size-6 rounded-full surface-aurora grid place-items-center">
              <Sparkles className="size-3 text-white relative z-10" strokeWidth={2.5} />
            </span>
          </button>

          <div className={`${demoMode ? "hidden" : "md:hidden"} size-8 rounded-full bg-foreground text-background grid place-items-center text-xs font-semibold`}>N</div>
        </div>
      </div>
    </div>
  );
}
