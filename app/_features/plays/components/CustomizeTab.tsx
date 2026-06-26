"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { PlaybookBlueprintView, PlayTemplateView } from "@/app/_features/plays/types";
import { syncPlaysCustomizeUrl } from "@/app/_features/plays/plays-tab-routing";
import { ConnectorsPage } from "@/app/_features/connectors/components/ConnectorsPage";
import {
  CustomizeSectionToggle,
  type CustomizeSection,
} from "./CustomizeSectionToggle";
import { PlaybookTab } from "./PlaybookTab";
import { PlaysSectionHeader } from "./PlaysSectionHeader";

/**
 * Customize Tab
 *
 * Contains two sub-sections:
 * - Playbooks: Templates and workflows
 * - Connectors: App connections (data sources)
 */

function parseCustomizeSection(value: string | null): CustomizeSection {
  if (value === "connectors") {
    return "connectors";
  }
  return "playbooks";
}

const sectionHeaders: Record<
  CustomizeSection,
  { eyebrow: string; title: string; description: string }
> = {
  playbooks: {
    eyebrow: "Reusable tactics",
    title: "Playbooks",
    description:
      "The library of moves Salt runs on your behalf. Each playbook is owned by a player and tuned to your preferences.",
  },
  connectors: {
    eyebrow: "Account access",
    title: "Connectors",
    description:
      "Connect the accounts Salt reads from. Salt asks before sending messages or running Plays.",
  },
};

interface CustomizeTabProps {
  connectors: ConnectorsPageData;
  blueprints: PlaybookBlueprintView[];
  adoptedTemplates: PlayTemplateView[];
  onBlueprintAdopted?: () => void;
}

export function CustomizeTab({
  connectors,
  blueprints,
  adoptedTemplates,
  onBlueprintAdopted,
}: CustomizeTabProps) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<CustomizeSection>(() =>
    parseCustomizeSection(searchParams.get("customize")),
  );

  useEffect(() => {
    setSection(parseCustomizeSection(searchParams.get("customize")));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("customize") !== "players") {
      return;
    }
    syncPlaysCustomizeUrl("playbooks");
  }, [searchParams]);

  const handleSectionChange = useCallback((nextSection: CustomizeSection) => {
    setSection(nextSection);
    syncPlaysCustomizeUrl(nextSection);
  }, []);

  const header = sectionHeaders[section];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PlaysSectionHeader
          eyebrow={header.eyebrow}
          title={header.title}
          description={header.description}
        />
        <CustomizeSectionToggle active={section} onChange={handleSectionChange} />
      </div>

      <motion.div
        key={section}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {section === "playbooks" ? (
          <PlaybookTab
            blueprints={blueprints}
            adoptedTemplates={adoptedTemplates}
            onBlueprintAdopted={onBlueprintAdopted}
          />
        ) : (
          <ConnectorsPage connectors={connectors} showHeader={false} />
        )}
      </motion.div>
    </div>
  );
}
