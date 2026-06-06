import { Landing2CapabilitiesSection } from "./Landing2CapabilitiesSection";
import { Landing2Footer } from "./Landing2Footer";
import { Landing2Hero } from "./Landing2Hero";
import { Landing2HeroShell } from "./Landing2HeroShell";
import { Landing2Nav } from "./Landing2Nav";
import { Landing2WaitlistSection } from "./Landing2WaitlistSection";
import "./landing2.css";

export function Landing2Page() {
  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <Landing2HeroShell>
          <Landing2Nav />
          <Landing2Hero />
        </Landing2HeroShell>
        <Landing2CapabilitiesSection />
        <Landing2WaitlistSection />
      </main>
      <Landing2Footer />
    </div>
  );
}
