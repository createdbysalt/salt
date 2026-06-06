"use client";

import { DotGridCanvas } from "./DotGridCanvas";
import { Landing2CapabilitiesSection } from "./Landing2CapabilitiesSection";
import { Landing2Footer } from "./Landing2Footer";
import { Landing2Hero } from "./Landing2Hero";
import { Landing2Nav } from "./Landing2Nav";
import { Landing2WaitlistSection } from "./Landing2WaitlistSection";
import "./landing2.css";

export function Landing2Page() {
  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <div className="relative isolate">
          <DotGridCanvas />
          <Landing2Nav />
          <Landing2Hero />
        </div>
        <Landing2CapabilitiesSection />
        <Landing2WaitlistSection />
      </main>
      <Landing2Footer />
    </div>
  );
}
