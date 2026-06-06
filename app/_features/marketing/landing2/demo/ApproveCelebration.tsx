import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export type Burst = {
  id: number;
  origin: { x: number; y: number };
};

// Flame-aligned palette
const COLORS = [
  "var(--flame)",
  "color-mix(in oklab, var(--flame) 70%, white)",
  "color-mix(in oklab, var(--flame) 55%, #ffb37a)",
  "#FFD27A",
  "#FF8A4C",
];

type Particle = {
  dx: number;
  dy: number;
  rot: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  duration: number;
  delay: number;
};

function makeParticles(seed: number, count = 28): Particle[] {
  // Simple deterministic-ish PRNG so particles differ per burst but stable on re-render.
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }).map(() => {
    // Bias upward: angle between -160deg and -20deg (in radians)
    const angle = ((-160 + rand() * 140) * Math.PI) / 180;
    const distance = 80 + rand() * 140;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot: (rand() - 0.5) * 540,
      size: 5 + rand() * 6,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      shape: rand() > 0.5 ? "rect" : "circle",
      duration: 0.9 + rand() * 0.6,
      delay: rand() * 0.05,
    };
  });
}

export function ApproveCelebration({
  burst,
  containment = "viewport",
}: {
  burst: Burst | null;
  /** viewport = fixed to window (Plays queue). parent = absolute within positioned ancestor (landing demo). */
  containment?: "viewport" | "parent";
}) {
  return (
    <div
      className={
        containment === "viewport"
          ? "pointer-events-none fixed inset-0 z-50 overflow-hidden"
          : "pointer-events-none absolute inset-0 z-50 overflow-hidden"
      }
    >
      <AnimatePresence>
        {burst && <ConfettiBurst key={burst.id} burst={burst} />}
      </AnimatePresence>
    </div>
  );
}

function ConfettiBurst({ burst }: { burst: Burst }) {
  const particles = useMemo(() => makeParticles(burst.id), [burst.id]);
  return (
    <div
      className="absolute"
      style={{ left: burst.origin.x, top: burst.origin.y }}
    >
      {/* Soft flash at origin */}
      <motion.span
        initial={{ opacity: 0.5, scale: 0.4 }}
        animate={{ opacity: 0, scale: 2.4 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 80,
          height: 80,
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--flame) 55%, transparent), transparent 70%)",
        }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{
            x: p.dx,
            y: [0, p.dy * 0.6, p.dy + 140],
            opacity: [0, 1, 1, 0],
            rotate: p.rot,
            scale: [0.6, 1, 1, 0.9],
          }}
          transition={{
            duration: p.duration,
            ease: [0.22, 0.61, 0.36, 1],
            delay: p.delay,
            times: [0, 0.2, 0.7, 1],
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.45 : p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "9999px" : 2,
            boxShadow: "0 0 8px color-mix(in oklab, var(--flame) 35%, transparent)",
          }}
        />
      ))}
    </div>
  );
}
