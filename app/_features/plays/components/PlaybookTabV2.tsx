"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  getSectionMeta,
} from "./PlaybookSectionNav";
import { PlaybookCardV2 } from "./PlaybookCardV2";
import { CreatePlaybookButton } from "./CreatePlaybookButton";
import { PlaysSearchField } from "./PlaysSearchField";
import {
  countPlaybookFilters,
  getPlaybookSource,
  PlaybookActiveFilterBadges,
  PlaybookFilterPanel,
  PLAYBOOK_SOURCE_LABELS,
  type PlaybookFiltersState,
  type PlaybookLayerFilter,
  type PlaybookSectionFilter,
  type PlaybookSourceFilter,
} from "./PlaybookFilterMenu";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type { PlaybookSection as V2Section } from "../playbooks/schema/v2/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

// Memory Care capabilities (records, hygiene, connections, notes) surface as
// capability cards in Memory → Rules and are hidden from the library here.
// getting-started and create-first-playbook are behind-the-scenes system
// behavior, not user-facing library entries.
// UI-layer filter only — discovery/execution are untouched.
const SECTION_ORDER: PlaybookSectionFilter[] = [
  "relationships",
  "work",
  "billing",
  "resources",
  "meetings",
  "me",
];

const HIDDEN_FROM_LIBRARY = new Set([
  "memory-records",
  "memory-hygiene",
  "connections",
  "notes",
  "getting-started",
  "create-first-playbook",
]);

const LAYER_OPTIONS: Array<{ id: PlaybookLayerFilter; label: string }> = [
  { id: "learn", label: "Memory" },
  { id: "act", label: "Action" },
];

const LAYER_LABELS: Record<PlaybookLayerFilter, string> = {
  learn: "Memory",
  act: "Action",
};

export interface PlaybookTabV2Props {
  playbooks: PlaybookListItem[];
  counts: {
    total: number;
    bySection: Record<V2Section, number>;
  };
}

export function PlaybookTabV2({ playbooks, counts: _counts }: PlaybookTabV2Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<PlaybookFiltersState>({
    sections: [],
    layers: [],
    sources: [],
  });

  const libraryPlaybooks = useMemo(
    () => playbooks.filter((pb) => !HIDDEN_FROM_LIBRARY.has(pb.slug)),
    [playbooks],
  );

  const sectionOptions = useMemo(
    () =>
      SECTION_ORDER.map((section) => ({
        id: section,
        label: getSectionMeta(section).label,
        count: libraryPlaybooks.filter((pb) => pb.section === section).length,
      })).filter((option) => option.count > 0),
    [libraryPlaybooks]
  );

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        sectionOptions.map((option) => [option.id, option.label])
      ) as Record<PlaybookSectionFilter, string>,
    [sectionOptions]
  );

  const sourceOptions = useMemo(() => {
    const counts: Record<PlaybookSourceFilter, number> = { salt: 0, yours: 0 };
    for (const playbook of libraryPlaybooks) {
      counts[getPlaybookSource(playbook.origin)]++;
    }

    return (["salt", "yours"] as const)
      .filter((source) => counts[source] > 0)
      .map((source) => ({
        id: source,
        label: PLAYBOOK_SOURCE_LABELS[source],
        count: counts[source],
      }));
  }, [libraryPlaybooks]);

  const activeFilterCount = countPlaybookFilters(filters);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return libraryPlaybooks.filter((pb) => {
      if (
        filters.sections.length > 0 &&
        !filters.sections.includes(pb.section as PlaybookSectionFilter)
      ) {
        return false;
      }
      if (
        filters.layers.length > 0 &&
        !filters.layers.includes(pb.layer as PlaybookLayerFilter)
      ) {
        return false;
      }
      if (
        filters.sources.length > 0 &&
        !filters.sources.includes(getPlaybookSource(pb.origin))
      ) {
        return false;
      }
      if (!term) return true;
      return (
        pb.name.toLowerCase().includes(term) ||
        pb.description.toLowerCase().includes(term)
      );
    });
  }, [filters.layers, filters.sections, filters.sources, playbooks, q]);

  function handleCardClick(slug: string) {
    router.push(`/plays/playbooks/${slug}`);
  }

  if (libraryPlaybooks.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center">
        <p className="font-display text-xl tracking-tight">
          No playbooks loaded
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Playbook definitions will appear here once the v2 registry is
          populated.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-4"
    >
      <div className="space-y-3">
        <PlaysSearchField
          value={q}
          onChange={setQ}
          placeholder="Search playbooks"
          filterActive={activeFilterCount > 0}
          filterActiveCount={activeFilterCount}
          filterTitle=""
          filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
          filterContent={
            <PlaybookFilterPanel
              state={filters}
              onChange={setFilters}
              sectionOptions={sectionOptions}
              layerOptions={LAYER_OPTIONS}
              sourceOptions={sourceOptions}
            />
          }
          trailingAction={<CreatePlaybookButton />}
        />

        <PlaybookActiveFilterBadges
          state={filters}
          onChange={setFilters}
          sectionLabels={sectionLabels}
          layerLabels={LAYER_LABELS}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-[minmax(0,auto)]">
        {filtered.map((pb, i) => (
          <div
            key={pb.slug}
            className="col-span-12 sm:col-span-6 lg:col-span-4"
          >
            <PlaybookCardV2
              slug={pb.slug}
              name={pb.name}
              description={pb.description}
              section={pb.section}
              origin={pb.origin}
              steps={pb.steps}
              stepCount={pb.stepCount}
              connectorIds={pb.connectorIds}
              minutesSavedPerRun={pb.minutesSavedPerRun}
              approvalMode={pb.approvalMode}
              triggerType={pb.triggerType}
              enabled={pb.enabled}
              runnable={pb.runnable}
              needsApp={pb.needsApp}
              disabledTools={pb.disabledTools}
              onClick={() => handleCardClick(pb.slug)}
              index={i}
            />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-12 glass-card rounded-3xl p-10 text-center">
            <p className="font-display text-xl tracking-tight">
              No playbooks match
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try clearing the search or adjusting the filters.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
