"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedGreetingProps {
  clientName: string;
  firstName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

const subtitles = [
  "Everything's looking great today.",
  "Your projects are right on track.",
  "Ready to make progress?",
  "Let's build something amazing.",
];

export function AnimatedGreeting({ clientName, firstName }: AnimatedGreetingProps) {
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const greeting = getGreeting();
  const displayName = firstName || clientName;

  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % subtitles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
      >
        {greeting}, {displayName}!
      </motion.h1>
      <motion.p
        key={subtitleIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="text-lg text-muted-foreground sm:text-xl"
      >
        {subtitles[subtitleIndex]}
      </motion.p>
    </div>
  );
}

