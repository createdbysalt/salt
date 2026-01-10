"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateMeetingDialog } from "./components/CreateMeetingDialog";
import { MeetingDetailPanel } from "./components/MeetingDetailPanel";
import { TodayView } from "./components/TodayView";
import { WeekView } from "./components/WeekView";
import { MonthView } from "./components/MonthView";
import { AgendaView } from "./components/AgendaView";
import type { Meeting, MeetingStatus, MeetingType, ViewMode } from "./types";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { useDashboardUser } from "@/src/features/shell/contexts/DashboardUserContext";

interface MeetingsPageClientProps {
  initialView?: ViewMode;
  initialDate?: string;
  openCreateDialog?: boolean;
  meetings: Meeting[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id: string }>;
}

type SortMode = "start_asc" | "start_desc";

export function MeetingsPageClient({
  initialView,
  initialDate,
  openCreateDialog = false,
  meetings: initialMeetings,
  clients,
  projects,
}: MeetingsPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | "all">("all");
  const [filterType, setFilterType] = useState<MeetingType | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("start_asc");
  const [createDialogOpen, setCreateDialogOpen] = useState(openCreateDialog);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [mounted, setMounted] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);

  // Set responsive default after mount
  useEffect(() => {
    setMounted(true);
    if (initialView) {
      setViewMode(initialView);
    } else {
      // Default to Today for both mobile and desktop
      setViewMode("today");
    }
    // Parse and validate initialDate
    if (initialDate) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (datePattern.test(initialDate)) {
        setSelectedDate(initialDate);
      }
    }
  }, [initialView, initialDate]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          setCreateDialogOpen(true);
          break;
        case "/":
          e.preventDefault();
          document.getElementById("meetings-search")?.focus();
          break;
        case "t":
          e.preventDefault();
          handleViewChange("today");
          break;
        case "w":
          e.preventDefault();
          handleViewChange("week");
          break;
        case "m":
          e.preventDefault();
          handleViewChange("month");
          break;
        case "a":
          e.preventDefault();
          handleViewChange("agenda");
          break;
        case "escape":
          e.preventDefault();
          setCreateDialogOpen(false);
          setSelectedMeeting(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted]);

  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    // Preserve date param if present
    if (selectedDate) {
      params.set("date", selectedDate);
    }
    router.push(`/dashboard/meetings?${params.toString()}`);
  };

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", date);
      // Switch to agenda view when selecting a date
      params.set("view", "agenda");
      setViewMode("agenda");
    } else {
      params.delete("date");
    }
    router.push(`/dashboard/meetings?${params.toString()}`);
  };

  const handleMeetingClick = (meeting: Meeting, isMobile = false) => {
    if (isMobile) {
      // Mobile: navigate to full page
      router.push(`/dashboard/meetings/${meeting.id}`);
    } else {
      // Desktop: open side panel
      setSelectedMeeting(meeting);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is applied live via `filteredMeetings`; no submit action needed.
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Filter + sort meetings
  const filteredMeetings = (() => {
    let filteredList = meetings;

    if (normalizedSearch) {
      filteredList = filteredList.filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(normalizedSearch) ||
          meeting.clientName.toLowerCase().includes(normalizedSearch) ||
          meeting.projectName?.toLowerCase().includes(normalizedSearch)
      );
    }

    if (filterStatus !== "all") {
      filteredList = filteredList.filter((m) => m.status === filterStatus);
    }

    if (filterType !== "all") {
      filteredList = filteredList.filter((m) => m.type === filterType);
    }

    const sorted = [...filteredList].sort((a, b) => {
      const diff = a.startTime.getTime() - b.startTime.getTime();
      return sortMode === "start_asc" ? diff : -diff;
    });

    return sorted;
  })();

  // If selected meeting disappears due to filters/search, clear it
  useEffect(() => {
    if (!selectedMeeting) return;
    const stillVisible = filteredMeetings.some((m) => m.id === selectedMeeting.id);
    if (!stillVisible) setSelectedMeeting(null);
  }, [filterStatus, filterType, sortMode, normalizedSearch]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="relative">
      {/* Right detail panel (mirrors left nav; wider; fixed under the top header) */}
      <MeetingDetailPanel meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      {/* Main content: reserve space for right panel on desktop */}
      <div
        className="space-y-6 transition-[padding] duration-200 ease-in-out lg:pr-0"
        style={{ paddingRight: selectedMeeting ? "28rem" : undefined }}
      >
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="meetings" viewer={user} />
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Top Bar: View Switcher + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)}>
          <TabsList className="gap-1">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <form
          onSubmit={handleSearchSubmit}
          className="flex gap-2 flex-1 sm:max-w-sm"
          role="search"
          aria-label="Search meetings"
        >
          {/* Controls (Filter + Sort) */}
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/60 px-1">
            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" type="button" aria-label="Filter meetings">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as MeetingStatus | "all")}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="upcoming">Upcoming</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="scheduled">Scheduled</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="live">Live</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed">Completed</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled">Cancelled</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="no-show">No-show</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as MeetingType | "all")}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="discovery">Discovery</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="check-in">Check-in</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="kickoff">Kickoff</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="review">Review</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="other">Other</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" type="button" aria-label="Sort meetings">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortMode}
                  onValueChange={(v) => setSortMode(v as SortMode)}
                >
                  <DropdownMenuRadioItem value="start_asc">Soonest first</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="start_desc">Latest first</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-0 rounded-2xl border border-border bg-background/60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="meetings-search"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </form>
      </div>

      {/* View Content */}
      <div className="min-h-[600px]">
          {viewMode === "today" && (
            <TodayView 
              meetings={filteredMeetings} 
              onMeetingClick={(meeting) => {
                const isMobile = window.innerWidth < 1024;
                handleMeetingClick(meeting, isMobile);
              }} 
            />
          )}
          {viewMode === "week" && (
            <WeekView 
              meetings={filteredMeetings} 
              onMeetingClick={(meeting) => {
                const isMobile = window.innerWidth < 1024;
                handleMeetingClick(meeting, isMobile);
              }}
              onDayClick={handleDateSelect}
            />
          )}
          {viewMode === "month" && (
            <MonthView 
              meetings={filteredMeetings} 
              onMeetingClick={(meeting) => {
                const isMobile = window.innerWidth < 1024;
                handleMeetingClick(meeting, isMobile);
              }}
              onDayClick={handleDateSelect}
            />
          )}
          {viewMode === "agenda" && (
            <AgendaView 
              meetings={filteredMeetings} 
              onMeetingClick={(meeting) => {
                const isMobile = window.innerWidth < 1024;
                handleMeetingClick(meeting, isMobile);
              }}
              selectedDate={selectedDate}
              onClearDateFilter={() => handleDateSelect(null)}
            />
          )}
      </div>

      {/* Keyboard Shortcuts Helper */}
      <div className="text-xs text-muted-foreground text-center border-t pt-4">
        <span className="hidden md:inline">
          Shortcuts: <kbd className="px-1.5 py-0.5 bg-muted rounded">n</kbd> new meeting •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">/</kbd> search •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">t/w/m/a</kbd> switch views
        </span>
      </div>

      {/* Dialogs & Drawers */}
      <CreateMeetingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        projects={projects}
      />
      </div>
    </div>
  );
}

