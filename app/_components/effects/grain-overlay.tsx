"use client";

// Subtle film grain overlay (no images, no text)
export function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.08] mix-blend-overlay"
      aria-hidden="true"
      style={{
        // Lightweight SVG noise tile (small + deterministic)
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27 viewBox=%270 0 120 120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27120%27 height=%27120%27 filter=%27url(%23n)%27 opacity=%271%27/%3E%3C/svg%3E")',
        backgroundSize: "180px 180px",
      }}
    />
  );
}


