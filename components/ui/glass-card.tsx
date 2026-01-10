import * as React from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface GlassCardProps extends React.ComponentProps<typeof Card> {
  /**
   * Visual intensity of the glass effect.
   * - subtle: less frosting/blur
   * - default: stronger frosting/blur
   */
  intensity?: "subtle" | "default";
  /**
   * Visual recipe for the glass panel.
   * - smoked: heavy blur, no visible rim lines (current default)
   * - blend: uses provided blend-mode + inset glow/shadow stack
   */
  variant?: "smoked" | "blend";
}

export function GlassCard({
  className,
  intensity = "default",
  variant = "smoked",
  children,
  style,
  ...props
}: GlassCardProps) {
  const isBlend = variant === "blend";

  const blendStyle: React.CSSProperties = {
    borderRadius: "107.854px",
    background:
      "linear-gradient(0deg, #0F0F0F 0%, #0F0F0F 100%), linear-gradient(0deg, rgba(51, 51, 51, 0.45) 0%, rgba(51, 51, 51, 0.45) 100%), rgba(153, 153, 153, 0.30)",
    backgroundBlendMode: "plus-lighter, luminosity, darken",
    boxShadow:
      "3.172px 3.172px 0 -1.586px #333 inset, -3.172px -3.172px 0 -1.586px #262626 inset, 3.172px 3.172px 1.586px -3.172px #FFF inset, -3.172px -3.172px 1.586px -3.172px #FFF inset, 0 0 9.517px 0 rgba(255, 255, 255, 0.50) inset, 0 0 50.755px 0 #F2F2F2 inset",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        isBlend ? "rounded-[107.854px]" : "rounded-3xl",
        !isBlend &&
          cn(
            // Smoked glass: dark translucent fill + very heavy blur
            intensity === "subtle"
              ? "bg-black/22 backdrop-blur-[90px] backdrop-saturate-125"
              : "bg-black/26 backdrop-blur-[120px] backdrop-saturate-125",
            // Soft wide shadow (outside) + subtle inset lighting (inspired by your shadow stack)
            intensity === "subtle"
              ? "shadow-[0_18px_70px_rgba(0,0,0,0.50),inset_3px_3px_0_-2px_rgba(255,255,255,0.05),inset_-3px_-3px_0_-2px_rgba(255,255,255,0.035),inset_0_0_14px_rgba(255,255,255,0.10)]"
              : "shadow-[0_22px_80px_rgba(0,0,0,0.55),inset_3px_3px_0_-2px_rgba(255,255,255,0.06),inset_-3px_-3px_0_-2px_rgba(255,255,255,0.04),inset_0_0_18px_rgba(255,255,255,0.12)]",
            // Diffuse highlight (blurred, not a line)
            intensity === "subtle"
              ? "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120%_100%_at_50%_-10%,rgba(255,255,255,0.08),transparent_60%)] before:blur-2xl"
              : "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120%_100%_at_50%_-10%,rgba(255,255,255,0.10),transparent_58%)] before:blur-2xl",
            // Subtle overall haze to keep it “frosted”
            "after:pointer-events-none after:absolute after:inset-0 after:bg-white/[0.02] dark:after:bg-white/[0.015]"
          ),
        className
      )}
      style={{
        ...(isBlend ? blendStyle : null),
        ...style,
      }}
      {...props}
    >
      {!isBlend && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-3xl",
            intensity === "subtle" ? "backdrop-blur-[120px]" : "backdrop-blur-[160px]",
            // show mostly at the edges (center transparent)
            "[mask-image:radial-gradient(closest-side,transparent_60%,black_100%)]",
            "[-webkit-mask-image:radial-gradient(closest-side,transparent_60%,black_100%)]",
            // slight haze so edges feel softer
            intensity === "subtle"
              ? "bg-white/[0.035] dark:bg-white/[0.02]"
              : "bg-white/[0.05] dark:bg-white/[0.03]"
          )}
        />
      )}
      {children}
    </Card>
  );
}


