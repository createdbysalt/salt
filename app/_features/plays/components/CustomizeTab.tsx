"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@repo/utils";
import { Users, BookOpen, Plug } from "lucide-react";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import { ConnectorsPage } from "@/app/_features/connectors/components/ConnectorsPage";
import { PlayersTab } from "./PlayersTab";
import { PlaybookTab } from "./PlaybookTab";
import { PlaysSectionHeader } from "./PlaysSectionHeader";

/**
 * Customize Tab
 *
 * Contains three sub-sections (from 2026-06-13 interview):
 * - Players: AI roles that create plays
 * - Playbooks: Templates and workflows
 * - Connectors: App connections (data sources)
 */

type CustomizeSection = "players" | "playbooks" | "connectors";

const sections: { id: CustomizeSection; label: string; icon: typeof Users }[] = [
  { id: "players", label: "Players", icon: Users },
  { id: "playbooks", label: "Playbooks", icon: BookOpen },
  { id: "connectors", label: "Connectors", icon: Plug },
];

interface CustomizeTabProps {
  connectors: ConnectorsPageData;
}

export function CustomizeTab({ connectors }: CustomizeTabProps) {
  const [section, setSection] = useState<CustomizeSection>("players");

  return (
    <div className="space-y-6">
      {/* Section Switcher */}
      <div className="flex items-center gap-2">
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="customize-section-bg"
                  className="absolute inset-0 rounded-lg bg-muted ring-1 ring-border/50"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {section === "players" && (
          <div className="space-y-6">
            <PlaysSectionHeader
              eyebrow="AI roles"
              title="Players"
              description="The AI roles that find opportunities and prepare work. Each player has a specialty and learns your preferences over time."
            />
            <PlayersTab />
          </div>
        )}

        {section === "playbooks" && (
          <div className="space-y-6">
            <PlaysSectionHeader
              eyebrow="Reusable tactics"
              title="Playbooks"
              description="The library of moves Salt runs on your behalf. Each playbook is owned by a player and tuned to your preferences."
            />
            <PlaybookTab />
          </div>
        )}

        {section === "connectors" && (
          <div className="space-y-6">
            <ConnectorsPage connectors={connectors} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
