"use client";

import * as React from "react";
import {
  Bell,
  CheckCircle2,
  Filter,
  Lightbulb,
  Link2,
  MessageSquareText,
  PenLine,
  Pin,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Badge, Button, Card, Input, Textarea } from "@repo/ui";
import { PageBanner } from "@repo/patterns";
import { cn } from "@repo/utils";
import {
  MOCK_NOTES,
  type MockMeKind,
  type MockNote,
  type MockNoteCategory,
  type MockNoteTimeGroup,
} from "@/app/_lib/demo";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";

type CategoryFilter =
  | "all"
  | "pinned"
  | "notes"
  | "report"
  | "principle"
  | "reference"
  | MockNoteCategory;
type TimeFilter = "all" | MockNoteTimeGroup;
type ViewMode = "pinned" | "all_notes";

const CATEGORY_FILTERS: { label: string; value: CategoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pinned", value: "pinned" },
  { label: "Notes", value: "notes" },
  { label: "Reports", value: "report" },
  { label: "Principles", value: "principle" },
  { label: "Reference", value: "reference" },
  { label: "Ideas", value: "idea" },
  { label: "Reminders", value: "reminder" },
  { label: "Reflections", value: "reflection" },
];

function getMeKind(note: MockNote): MockMeKind {
  return note.meKind ?? "note";
}

const ME_KIND_LABELS: Record<MockMeKind, string> = {
  note: "Note",
  report: "Report",
  principle: "Principle",
  reference: "Reference",
};

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Older", value: "older" },
];

const CATEGORY_META: Record<
  MockNoteCategory,
  { label: string; icon: typeof Lightbulb; dotClassName: string }
> = {
  idea: {
    label: "Idea",
    icon: Lightbulb,
    dotClassName: "bg-primary",
  },
  reminder: {
    label: "Reminder",
    icon: Bell,
    dotClassName: "bg-success",
  },
  reflection: {
    label: "Reflection",
    icon: MessageSquareText,
    dotClassName: "bg-muted-foreground",
  },
};

export function MePage() {
  const mockContent = useMockContent();
  const [notes, setNotes] = React.useState<MockNote[]>(() =>
    mockContent ? MOCK_NOTES : [],
  );
  const [mode, setMode] = React.useState<ViewMode>("pinned");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const [showComposer, setShowComposer] = React.useState(false);
  const [draftContent, setDraftContent] = React.useState("");
  const [draftCategory, setDraftCategory] =
    React.useState<MockNoteCategory>("idea");

  const visibleNotes = React.useMemo(() => {
    if (mode === "pinned") {
      return notes.filter((note) => note.isPinned && !note.isArchived);
    }

    return notes.filter((note) => !note.isArchived);
  }, [mode, notes]);

  const filteredNotes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return visibleNotes.filter((note) => {
      if (categoryFilter === "pinned" && !note.isPinned) return false;
      if (categoryFilter === "notes" && getMeKind(note) !== "note") {
        return false;
      }
      if (
        categoryFilter === "report" ||
        categoryFilter === "principle" ||
        categoryFilter === "reference"
      ) {
        if (getMeKind(note) !== categoryFilter) return false;
      }
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "pinned" &&
        categoryFilter !== "notes" &&
        categoryFilter !== "report" &&
        categoryFilter !== "principle" &&
        categoryFilter !== "reference" &&
        note.category !== categoryFilter
      ) {
        return false;
      }
      if (timeFilter !== "all" && note.timeGroup !== timeFilter) return false;
      if (!query) return true;

      return (
        note.content.toLowerCase().includes(query) ||
        note.linkedEntities.some((entity) =>
          entity.label.toLowerCase().includes(query)
        )
      );
    });
  }, [categoryFilter, searchQuery, timeFilter, visibleNotes]);

  const groupedByDate = React.useMemo(() => {
    const groups = new Map<string, MockNote[]>();

    for (const note of filteredNotes) {
      const group = groups.get(note.date) ?? [];
      group.push(note);
      groups.set(note.date, group);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredNotes]);

  const hasActiveFilters = categoryFilter !== "all" || timeFilter !== "all";
  const pinnedCount = notes.filter((note) => note.isPinned).length;
  const connectedCount = notes.filter(
    (note) => note.linkedEntities.length > 0
  ).length;

  const viewTabs = React.useMemo(
    () => [
      {
        label: (
          <span className="flex items-center">
            Pinned
            {pinnedCount > 0 && <TabBadge count={pinnedCount} />}
          </span>
        ),
        value: "pinned" as const,
      },
      { label: "Everything", value: "all_notes" as const },
    ],
    [pinnedCount]
  );

  const filterLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (categoryFilter !== "all") {
      parts.push(
        CATEGORY_FILTERS.find((filter) => filter.value === categoryFilter)
          ?.label ?? ""
      );
    }
    if (timeFilter !== "all") {
      parts.push(
        TIME_FILTERS.find((filter) => filter.value === timeFilter)?.label ?? ""
      );
    }
    return parts.length > 0 ? parts.join(" · ") : "All";
  }, [categoryFilter, timeFilter]);

  const handleAddNote = () => {
    const content = draftContent.trim();
    if (!content) return;

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const dateLabel = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const newNote: MockNote = {
      id: `note_local_${now.getTime()}`,
      content,
      date,
      dateLabel,
      timeGroup: "today",
      category: draftCategory,
      isPinned: false,
      isArchived: false,
      linkedEntities: [],
      meKind: "note",
    };

    setNotes((current) => [newNote, ...current]);
    setDraftContent("");
    setDraftCategory("idea");
    setShowComposer(false);
  };

  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="MEMORY"
        title="Me"
        subtitle="Your private studio knowledge—reports, principles, and notes Salt can use when helping you."
        tabs={viewTabs}
        activeTab={mode}
        onTabChange={(value) => {
          setMode(value as ViewMode);
          setCategoryFilter("all");
          setTimeFilter("all");
          setSearchQuery("");
        }}
        fullWidthDivider
        actions={
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowComposer((value) => !value)}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        }
      />

      {showComposer && (
        <Card className="mb-6 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Add a note</p>
              <p className="text-xs text-muted-foreground">
                For the demo, this saves locally and appears at the top of Today.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowComposer(false)}
              aria-label="Close composer"
            >
              <X className="size-4" />
            </Button>
          </div>

          <Textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder="Capture a thought, reminder, or pattern Salt should remember..."
            className="mt-4 min-h-28"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {Object.entries(CATEGORY_META).map(([category, meta]) => {
                const value = category as MockNoteCategory;
                const Icon = meta.icon;

                return (
                  <Button
                    key={category}
                    type="button"
                    variant={draftCategory === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDraftCategory(value)}
                  >
                    <Icon className="size-3.5" />
                    {meta.label}
                  </Button>
                );
              })}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddNote}
              disabled={!draftContent.trim()}
            >
              <Sparkles className="size-3.5" />
              Save Note
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Me or linked entities..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((value) => !value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition-colors",
              hasActiveFilters
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-foreground/5 text-foreground hover:bg-foreground/10"
            )}
          >
            <Filter className="size-3.5" />
            <span>{filterLabel}</span>
          </button>

          {showFilterMenu && (
            <Card className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg p-1 shadow-lg">
              <FilterSection title="Category">
                {CATEGORY_FILTERS.map((filter) => (
                  <FilterOption
                    key={filter.value}
                    label={filter.label}
                    active={categoryFilter === filter.value}
                    onClick={() => setCategoryFilter(filter.value)}
                  />
                ))}
              </FilterSection>

              <div className="my-1 border-t border-border" />

              <FilterSection title="Time">
                {TIME_FILTERS.map((filter) => (
                  <FilterOption
                    key={filter.value}
                    label={filter.label}
                    active={timeFilter === filter.value}
                    onClick={() => setTimeFilter(filter.value)}
                  />
                ))}
              </FilterSection>

              {hasActiveFilters && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setTimeFilter("all");
                      setShowFilterMenu(false);
                    }}
                    className="w-full rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      {mode === "pinned" && filteredNotes.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredNotes.length} pinned items</span> kept close for context.
        </p>
      )}

      <div className="space-y-8">
        {groupedByDate.map(([date, entries]) => (
          <DailyNotesGroup key={date} notes={entries} />
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <Card className="rounded-xl p-12 text-center">
          <PenLine className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <h3 className="font-semibold">
            {mode === "pinned" ? "Nothing pinned yet" : "Nothing found"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "pinned"
              ? "Pin reports, principles, or notes to keep them close, or switch to Everything."
              : "Try a different search or clear the filters."}
          </p>
        </Card>
      )}
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-light text-foreground"
      style={{ backgroundColor: "#e8e9fe" }}
    >
      {count}
    </span>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
        active && "bg-muted"
      )}
    >
      <span>{label}</span>
      {active && <CheckCircle2 className="size-3.5 text-primary" />}
    </button>
  );
}

function DailyNotesGroup({ notes }: { notes: MockNote[] }) {
  const dateLabel = notes[0]?.dateLabel ?? "";

  return (
    <section>
      <h2 className="mb-4 border-b border-border/50 pb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {dateLabel}
      </h2>
      <div className="space-y-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
}

function NoteCard({ note }: { note: MockNote }) {
  const meta = CATEGORY_META[note.category];
  const Icon = meta.icon;
  const meKind = getMeKind(note);

  return (
    <Card className="rounded-xl p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-2 size-2 rounded-full shrink-0", meta.dotClassName)}
        />
        <div className="min-w-0 flex-1">
          {note.title && (
            <p className="mb-1 text-sm font-medium text-foreground">{note.title}</p>
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {ME_KIND_LABELS[meKind]}
            </Badge>
            {meKind === "note" && (
              <Badge variant="outline" className="gap-1">
                <Icon className="size-3" />
                {meta.label}
              </Badge>
            )}
            {note.isPinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="size-3" />
                Pinned
              </Badge>
            )}
            {note.linkedEntities.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Link2 className="size-3" />
                {note.linkedEntities.length} linked
              </Badge>
            )}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {note.content}
          </p>

          {note.linkedEntities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {note.linkedEntities.map((entity) => (
                <span
                  key={entity.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  <Link2 className="size-3" />
                  {entity.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** @deprecated Use MePage */
export const NotesPage = MePage;
