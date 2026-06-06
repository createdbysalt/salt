"use client";

import { type ReactNode } from "react";

/** iPhone-style chassis for the mobile landing demo. Purely presentational. */
export function Landing2PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[94%] h-8 w-[70%] -translate-x-1/2 rounded-[50%] bg-foreground/20 blur-2xl"
      />

      <div
        className="relative"
        style={{
          filter:
            "drop-shadow(0 24px 40px rgba(15, 17, 25, 0.22)) drop-shadow(0 6px 12px rgba(15, 17, 25, 0.12))",
        }}
      >
        <div
          className="relative rounded-[52px] p-[3px]"
          style={{
            background:
              "linear-gradient(135deg, #2a2c33 0%, #6b6e76 22%, #c9ccd2 45%, #5a5d65 62%, #2a2c33 100%)",
          }}
        >
          <div
            className="rounded-[49px] p-[2px]"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.35), rgba(0,0,0,0.55) 45%, rgba(255,255,255,0.18) 75%, rgba(0,0,0,0.6))",
            }}
          >
            <div className="relative rounded-[47px] bg-[#0a0a0c] p-[8px]">
              <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[40px] bg-black">
                {children}

                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[10px] z-20 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.6)",
                  }}
                >
                  <span className="absolute right-[14px] top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-[#1a1a1f]" />
                </div>

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-[40px]"
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.06) 100%)",
                  }}
                />
              </div>
            </div>
          </div>

          <span
            aria-hidden
            className="absolute left-[-4px] top-[110px] h-[26px] w-[4px] rounded-l-sm"
            style={{
              background:
                "linear-gradient(90deg, #1d1f24 0%, #6e7178 60%, #2a2c33 100%)",
            }}
          />
          <span
            aria-hidden
            className="absolute left-[-4px] top-[170px] h-[44px] w-[4px] rounded-l-sm"
            style={{
              background:
                "linear-gradient(90deg, #1d1f24 0%, #6e7178 60%, #2a2c33 100%)",
            }}
          />
          <span
            aria-hidden
            className="absolute left-[-4px] top-[230px] h-[44px] w-[4px] rounded-l-sm"
            style={{
              background:
                "linear-gradient(90deg, #1d1f24 0%, #6e7178 60%, #2a2c33 100%)",
            }}
          />
          <span
            aria-hidden
            className="absolute right-[-4px] top-[190px] h-[64px] w-[4px] rounded-r-sm"
            style={{
              background:
                "linear-gradient(270deg, #1d1f24 0%, #6e7178 60%, #2a2c33 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
