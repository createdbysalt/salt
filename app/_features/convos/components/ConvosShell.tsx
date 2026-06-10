import type { ReactNode } from "react";

/** Edge-to-edge inbox within the dashboard content shell (matches prototype Convos layout). */
export function ConvosShell({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100dvh-4rem-1.25rem)] min-h-0 flex-col lg:-mx-10 lg:-mt-8 lg:h-[calc(100dvh-4rem-2rem)]">
      {children}
    </div>
  );
}
