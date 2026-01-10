"use client";

import { useRef, useEffect, useState } from "react";
import { ChromaFlow, Shader, Swirl } from "shaders/react";
import { CustomCursor } from "@/components/effects/custom-cursor";
import { GrainOverlay } from "@/components/effects/grain-overlay";

export default function PlaygroundClient() {
  const shaderContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const scrollThrottleRef = useRef<number | undefined>(undefined);

  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

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

  const scrollToSection = (index: number) => {
    if (scrollContainerRef.current) {
      const sectionWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: sectionWidth * index,
        behavior: "smooth",
      });
      setCurrentSection(index);
    }
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? 0;
      touchStartX.current = e.touches[0]?.clientX ?? 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (Math.abs((e.touches[0]?.clientY ?? 0) - touchStartY.current) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0]?.clientY ?? 0;
      const touchEndX = e.changedTouches[0]?.clientX ?? 0;
      const deltaY = touchStartY.current - touchEndY;
      const deltaX = touchStartX.current - touchEndX;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        if (deltaY > 0 && currentSection < 4) {
          scrollToSection(currentSection + 1);
        } else if (deltaY < 0 && currentSection > 0) {
          scrollToSection(currentSection - 1);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [currentSection]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();

        if (!scrollContainerRef.current) return;

        scrollContainerRef.current.scrollBy({
          left: e.deltaY,
          behavior: "auto",
        });

        const sectionWidth = scrollContainerRef.current.offsetWidth;
        const newSection = Math.round(scrollContainerRef.current.scrollLeft / sectionWidth);
        if (newSection !== currentSection) {
          setCurrentSection(newSection);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [currentSection]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollThrottleRef.current) return;

      scrollThrottleRef.current = requestAnimationFrame(() => {
        if (!scrollContainerRef.current) {
          scrollThrottleRef.current = undefined;
          return;
        }

        const sectionWidth = scrollContainerRef.current.offsetWidth;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const newSection = Math.round(scrollLeft / sectionWidth);

        if (newSection !== currentSection && newSection >= 0 && newSection <= 4) {
          setCurrentSection(newSection);
        }

        scrollThrottleRef.current = undefined;
      });
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      if (scrollThrottleRef.current) {
        cancelAnimationFrame(scrollThrottleRef.current);
      }
    };
  }, [currentSection]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <CustomCursor />
      <GrainOverlay />

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
            colorA="#2961D9"
            colorB="#372C32"
            speed={0.8}
            detail={0.8}
            blend={50}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
          <ChromaFlow
            baseColor="#372C32"
            upColor="#2961D9"
            downColor="#D6DDD8"
            leftColor="#E9FCBF"
            rightColor="#FFFFFF"
            intensity={0.9}
            radius={1.8}
            momentum={25}
            maskType="alpha"
            opacity={0.97}
          />
        </Shader>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Horizontal scroll container (no content by default) */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        aria-label="Playground sections"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <section
            key={i}
            className="h-full w-full shrink-0 snap-start"
            aria-label={`Section ${i + 1}`}
          />
        ))}
      </div>
    </main>
  );
}


