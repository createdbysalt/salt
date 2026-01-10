"use client";

import { useEffect, useRef, useState } from "react";
import { Shader, Swirl } from "shaders/react";

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { MagneticHover } from "@/components/effects/magnetic-hover";

export default function SwirlClient() {
  const shaderContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector("canvas");
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsLoaded(true);
          return true;
        }
      }
      return false;
    };

    if (checkShaderReady()) return;

    const intervalId = window.setInterval(() => {
      if (checkShaderReady()) {
        window.clearInterval(intervalId);
      }
    }, 100);

    const fallbackTimer = window.setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ contain: "strict" }}
        aria-hidden="true"
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1b76FF"
            colorB="#372C32"
            speed={0.22}
            detail={0.65}
            blend={90}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
        </Shader>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Center card (design system) */}
      <div className="relative z-10 flex h-full w-full items-center justify-center p-6">
        <MagneticHover maxTranslate={5} maxRotate={1}>
          <GlassCard className="w-[min(92vw,560px)]" intensity="default">
          <CardHeader>
            <CardTitle>Card Playground</CardTitle>
            <CardDescription>
              Use this card to experiment with your design system styling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-muted/60 dark:bg-white/5" />
              <div className="h-10 rounded-lg bg-muted/60 dark:bg-white/5" />
              <div className="h-24 rounded-lg bg-muted/40 dark:bg-white/5" />
            </div>
          </CardContent>
          </GlassCard>
        </MagneticHover>
      </div>
    </main>
  );
}


