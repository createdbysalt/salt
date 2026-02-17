"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@repo/utils";
import {
  Circle,
  CircleDot,
  CheckCircle2,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  format,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import Link from "next/link";
import { studioRoutes } from "@/app/_features/shell/routes";
import { updateProjectDates } from "@/app/_features/projects/actions";

// ============================================================================
// Types
// ============================================================================

export type ZoomLevel = "week" | "month" | "quarter" | "year";

interface TimelineProject {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  status: string;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  startDate: string | null;
  deadline: string | null;
  milestoneProgress: { completed: number; total: number } | null;
  isRetainer: boolean;
  createdAt: string;
}

interface ProjectsTimelineViewProps {
  projects: TimelineProject[];
}

// ============================================================================
// Constants
// ============================================================================

const ZOOM_CONFIG: Record<
  ZoomLevel,
  {
    label: string;
    shortcut: string;
    unitWidth: number;
    getUnits: (start: Date, end: Date) => Date[];
    formatHeader: (date: Date) => string;
  }
> = {
  week: {
    label: "Week",
    shortcut: "W",
    unitWidth: 100,
    getUnits: (start, end) => {
      const units: Date[] = [];
      let current = startOfDay(start);
      while (current <= end) {
        units.push(current);
        current = addDays(current, 1);
      }
      return units;
    },
    formatHeader: (d) => format(d, "EEE d"),
  },
  month: {
    label: "Month",
    shortcut: "M",
    unitWidth: 32,
    getUnits: (start, end) => {
      const units: Date[] = [];
      let current = startOfDay(start);
      while (current <= end) {
        units.push(current);
        current = addDays(current, 1);
      }
      return units;
    },
    formatHeader: (d) => format(d, "d"),
  },
  quarter: {
    label: "Quarter",
    shortcut: "Q",
    unitWidth: 24,
    getUnits: (start, end) => {
      const units: Date[] = [];
      let current = startOfWeek(start);
      while (current <= end) {
        units.push(current);
        current = addWeeks(current, 1);
      }
      return units;
    },
    formatHeader: (d) => `W${format(d, "w")}`,
  },
  year: {
    label: "Year",
    shortcut: "Y",
    unitWidth: 80,
    getUnits: (start, end) => {
      const units: Date[] = [];
      let current = startOfMonth(start);
      while (current <= end) {
        units.push(current);
        current = addMonths(current, 1);
      }
      return units;
    },
    formatHeader: (d) => format(d, "MMM"),
  },
};

const STATUS_ICONS = {
  not_started: Circle,
  backlog: Circle,
  todo: Circle,
  in_progress: CircleDot,
  active: CircleDot,
  complete: CheckCircle2,
  done: CheckCircle2,
  cancelled: Circle,
};

const ROW_HEIGHT = 64;
const LEFT_PANEL_WIDTH = 280;

// ============================================================================
// Main Component
// ============================================================================

export function ProjectsTimelineView({ projects }: ProjectsTimelineViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out retainers (cyclical, not linear time)
  const timelineProjects = useMemo(
    () => projects.filter((p) => !p.isRetainer),
    [projects]
  );

  // Calculate timeline range
  const { rangeStart, rangeEnd, timeUnits, totalWidth } = useMemo(() => {
    const config = ZOOM_CONFIG[zoom];
    const now = new Date();

    let minDate = now;
    let maxDate = now;

    timelineProjects.forEach((p) => {
      if (p.startDate) {
        const start = parseISO(p.startDate);
        if (isValid(start) && isBefore(start, minDate)) minDate = start;
      }
      if (p.deadline) {
        const end = parseISO(p.deadline);
        if (isValid(end) && isAfter(end, maxDate)) maxDate = end;
      }
    });

    // Add padding based on zoom
    const paddingMonths = zoom === "year" ? 6 : zoom === "quarter" ? 3 : 2;
    const paddedStart = addMonths(minDate, -paddingMonths);
    const paddedEnd = addMonths(maxDate, paddingMonths);

    const units = config.getUnits(paddedStart, paddedEnd);
    const width = units.length * config.unitWidth;

    return {
      rangeStart: paddedStart,
      rangeEnd: paddedEnd,
      timeUnits: units,
      totalWidth: width,
    };
  }, [timelineProjects, zoom]);

  // Calculate today position
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (isBefore(today, rangeStart) || isAfter(today, rangeEnd)) return null;

    const config = ZOOM_CONFIG[zoom];
    if (zoom === "year") {
      return differenceInMonths(today, rangeStart) * config.unitWidth;
    } else if (zoom === "quarter") {
      return differenceInWeeks(today, rangeStart) * config.unitWidth;
    }
    return differenceInDays(today, rangeStart) * config.unitWidth;
  }, [rangeStart, rangeEnd, zoom]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current && todayPosition !== null) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollLeft = Math.max(
        0,
        todayPosition - containerWidth / 3
      );
    }
  }, [todayPosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case "t":
          scrollToToday();
          break;
        case "y":
          setZoom("year");
          break;
        case "q":
          setZoom("quarter");
          break;
        case "m":
          setZoom("month");
          break;
        case "w":
          setZoom("week");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pinch-to-zoom gesture support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScale = 1;
    const zoomLevels: ZoomLevel[] = ["week", "month", "quarter", "year"];

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        setZoom((prev) => {
          const idx = zoomLevels.indexOf(prev);
          const newIdx = Math.max(0, Math.min(zoomLevels.length - 1, idx + delta));
          return zoomLevels[newIdx];
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const scrollToToday = useCallback(() => {
    if (scrollContainerRef.current && todayPosition !== null) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, todayPosition - containerWidth / 3),
        behavior: "smooth",
      });
    }
  }, [todayPosition]);

  // Helper to calculate bar position - uses createdAt as fallback when dates not set
  const getBarPosition = useCallback(
    (project: TimelineProject): { left: number; width: number; isEstimated: boolean } | null => {
      const config = ZOOM_CONFIG[zoom];
      const start = project.startDate ? parseISO(project.startDate) : null;
      const end = project.deadline ? parseISO(project.deadline) : null;
      const created = parseISO(project.createdAt);
      const today = new Date();

      // Determine actual bar dates with smart fallbacks
      let barStart: Date;
      let barEnd: Date;
      let isEstimated = false;

      if (start && end) {
        // Has both dates - use them
        barStart = start;
        barEnd = end;
      } else if (start && !end) {
        // Has start but no deadline - estimate 30 days from start or until today (whichever is further)
        barStart = start;
        barEnd = isAfter(today, addDays(start, 30)) ? today : addDays(start, 30);
        isEstimated = true;
      } else if (!start && end) {
        // Has deadline but no start - use created date as start
        barStart = created;
        barEnd = end;
        isEstimated = true;
      } else {
        // No dates at all - use created date to today (minimum 14 days)
        barStart = created;
        const minEnd = addDays(created, 14);
        barEnd = isAfter(today, minEnd) ? today : minEnd;
        isEstimated = true;
      }

      let leftPos: number;
      let width: number;

      if (zoom === "year") {
        leftPos = differenceInMonths(barStart, rangeStart) * config.unitWidth;
        width = (differenceInMonths(barEnd, barStart) || 1) * config.unitWidth;
      } else if (zoom === "quarter") {
        leftPos = differenceInWeeks(barStart, rangeStart) * config.unitWidth;
        width = (differenceInWeeks(barEnd, barStart) || 1) * config.unitWidth;
      } else {
        leftPos = differenceInDays(barStart, rangeStart) * config.unitWidth;
        width = (differenceInDays(barEnd, barStart) || 1) * config.unitWidth;
      }

      // Minimum width scales with zoom level to ensure bars are always visible
      // Year: at least 1 month (80px), Quarter: at least 1 week (24px), others: at least 40px
      const minWidth = zoom === "year" ? config.unitWidth : zoom === "quarter" ? config.unitWidth : 40;

      return { left: Math.max(0, leftPos), width: Math.max(minWidth, width), isEstimated };
    },
    [zoom, rangeStart, rangeEnd]
  );

  if (timelineProjects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No projects with dates found</p>
          <p className="text-sm mt-1">
            Add start dates and deadlines to see them on the timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col bg-background h-full">

      {/* Timeline Grid - fills entire viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel (sticky) */}
        <div
          className="shrink-0 border-r bg-background overflow-y-auto flex flex-col"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header row with controls */}
          <div className="h-10 border-b shrink-0 flex items-center justify-between px-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={scrollToToday}
            >
              Today
            </Button>

            <div className="flex items-center border rounded-md">
              {(["week", "month", "quarter", "year"] as const).map((level) => (
                <Button
                  key={level}
                  variant={zoom === level ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs rounded-none first:rounded-l-md last:rounded-r-md",
                    zoom === level && "bg-muted"
                  )}
                  onClick={() => setZoom(level)}
                >
                  {ZOOM_CONFIG[level].shortcut}
                </Button>
              ))}
            </div>
          </div>

          {/* Project rows */}
          {timelineProjects.map((project) => {
            const StatusIcon =
              STATUS_ICONS[project.status as keyof typeof STATUS_ICONS] || Circle;

            return (
              <Link
                key={project.id}
                href={studioRoutes.projects.timeline(project.id)}
                className="flex items-center gap-3 px-4 hover:bg-muted/50 transition-colors border-b shrink-0"
                style={{ height: ROW_HEIGHT }}
              >
                <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate">
                  {project.name}
                </span>
              </Link>
            );
          })}

          {/* Fill remaining space in left panel */}
          <div className="flex-1 min-h-[200px]" />
        </div>

        {/* Right Panel (scrollable canvas) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
        >
          <div style={{ width: totalWidth, minWidth: "100%" }} className="flex flex-col min-h-full">
            {/* Time axis */}
            <TimeAxis units={timeUnits} zoom={zoom} rangeStart={rangeStart} />

            {/* Project bars area - grows to fill viewport */}
            <div className="relative flex-1" style={{ minHeight: Math.max(timelineProjects.length * ROW_HEIGHT + 200, 400) }}>
              {/* Vertical grid lines (dashed) - extend to full height */}
              <GridLines units={timeUnits} zoom={zoom} minHeight={Math.max(timelineProjects.length * ROW_HEIGHT + 400, 600)} />

              {/* Today line - extends full height */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 w-0.5 bg-primary z-20 pointer-events-none"
                  style={{ left: todayPosition, height: "100%" }}
                />
              )}

              {/* Project bars */}
              {timelineProjects.map((project, idx) => {
                const barPos = getBarPosition(project);

                return (
                  <div
                    key={project.id}
                    className="relative border-b border-border/30"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {barPos && (
                      <DraggableBar
                        project={project}
                        left={barPos.left}
                        width={barPos.width}
                        zoom={zoom}
                        rangeStart={rangeStart}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                        isEstimated={barPos.isEstimated}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TimeAxisProps {
  units: Date[];
  zoom: ZoomLevel;
  rangeStart: Date;
}

function TimeAxis({ units, zoom, rangeStart }: TimeAxisProps) {
  const config = ZOOM_CONFIG[zoom];

  // Group by month for header
  const monthGroups = useMemo(() => {
    const groups: { month: string; year: string; startIdx: number; count: number; showYear: boolean }[] = [];
    let currentMonth = "";
    let lastYear = "";

    units.forEach((unit, idx) => {
      const month = format(unit, "MMM");
      const year = format(unit, "yyyy");
      const key = `${month}-${year}`;

      if (key !== currentMonth) {
        // Only show year if it changed from the previous group
        const showYear = year !== lastYear;
        groups.push({ month, year, startIdx: idx, count: 1, showYear });
        currentMonth = key;
        lastYear = year;
      } else {
        groups[groups.length - 1].count++;
      }
    });

    return groups;
  }, [units]);

  const today = startOfDay(new Date());

  // For year view, find today's position to show the badge in the header
  const todayGroupIdx = useMemo(() => {
    if (zoom !== "year") return -1;
    return monthGroups.findIndex(
      (g) => g.month === format(today, "MMM") && g.year === format(today, "yyyy")
    );
  }, [monthGroups, today, zoom]);

  return (
    <div className="h-10 border-b flex flex-col sticky top-0 bg-background z-10">
      {/* Month headers - single row for Year view */}
      <div className={cn("flex border-b border-border/50", zoom === "year" ? "h-10" : "h-5")}>
        {monthGroups.map((group, idx) => {
          const isCurrentMonth = idx === todayGroupIdx;

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center px-2 text-xs font-medium border-r border-border/30",
                isCurrentMonth ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ width: group.count * config.unitWidth }}
            >
              {isCurrentMonth && zoom === "year" ? (
                <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  {group.month.toUpperCase()} {format(today, "d")}
                </span>
              ) : (
                <>
                  {group.month.toUpperCase()}
                  {group.showYear && <span className="ml-1 text-muted-foreground/70">{group.year}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Day/week indicators - hide for Year view (single row is enough) */}
      {zoom !== "year" && (
        <div className="flex h-5 relative">
          {units.map((unit, idx) => {
            const isToday =
              format(unit, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

            // Only show labels at intervals to avoid clutter
            const showLabel =
              zoom === "quarter" ||
              (zoom === "month" && (unit.getDate() === 1 || unit.getDate() % 7 === 0)) ||
              zoom === "week";

            return (
              <div
                key={idx}
                className="flex items-center justify-center text-[10px] text-muted-foreground relative"
                style={{ width: config.unitWidth }}
              >
                {isToday ? (
                  <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    {format(today, "MMM d").toUpperCase()}
                  </span>
                ) : (
                  showLabel && config.formatHeader(unit)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface GridLinesProps {
  units: Date[];
  zoom: ZoomLevel;
  minHeight: number;
}

function GridLines({ units, zoom, minHeight }: GridLinesProps) {
  const config = ZOOM_CONFIG[zoom];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ minHeight }}>
      {units.map((unit, idx) => {
        // Show stronger lines at month boundaries
        const isMonthStart = unit.getDate() === 1;
        const isWeekStart = unit.getDay() === 0;

        const showLine =
          zoom === "year" ||
          zoom === "quarter" ||
          (zoom === "month" && (isMonthStart || isWeekStart)) ||
          zoom === "week";

        if (!showLine) return null;

        return (
          <div
            key={idx}
            className={cn(
              "absolute top-0 bottom-0 border-l",
              isMonthStart
                ? "border-border/60"
                : "border-border/20 border-dashed"
            )}
            style={{ left: idx * config.unitWidth }}
          />
        );
      })}
    </div>
  );
}

interface DraggableBarProps {
  project: TimelineProject;
  left: number;
  width: number;
  zoom: ZoomLevel;
  rangeStart: Date;
  onDragStart: () => void;
  onDragEnd: () => void;
  isEstimated?: boolean;
}

function DraggableBar({
  project,
  left,
  width,
  zoom,
  rangeStart,
  onDragStart,
  onDragEnd,
  isEstimated = false,
}: DraggableBarProps) {
  const [localLeft, setLocalLeft] = useState(left);
  const [localWidth, setLocalWidth] = useState(width);
  const [isDragging, setIsDragging] = useState<"move" | "left" | "right" | null>(
    null
  );
  const [hoveringEdge, setHoveringEdge] = useState<"left" | "right" | null>(null);
  const dragStartRef = useRef({ x: 0, left: 0, width: 0 });

  // Reset local state when props change
  useEffect(() => {
    if (!isDragging) {
      setLocalLeft(left);
      setLocalWidth(width);
    }
  }, [left, width, isDragging]);

  const config = ZOOM_CONFIG[zoom];

  const positionToDate = useCallback(
    (pos: number): Date => {
      if (zoom === "year") {
        return addMonths(rangeStart, Math.round(pos / config.unitWidth));
      } else if (zoom === "quarter") {
        return addWeeks(rangeStart, Math.round(pos / config.unitWidth));
      }
      return addDays(rangeStart, Math.round(pos / config.unitWidth));
    },
    [zoom, rangeStart, config.unitWidth]
  );

  // Calculate dates for tooltips
  const currentStartDate = useMemo(() => positionToDate(localLeft), [positionToDate, localLeft]);
  const currentEndDate = useMemo(() => positionToDate(localLeft + localWidth), [positionToDate, localLeft, localWidth]);

  // Calculate days difference from original
  const startDaysDiff = useMemo(() => {
    if (!project.startDate) return 0;
    const original = parseISO(project.startDate);
    return differenceInDays(currentStartDate, original);
  }, [currentStartDate, project.startDate]);

  const endDaysDiff = useMemo(() => {
    if (!project.deadline) return 0;
    const original = parseISO(project.deadline);
    return differenceInDays(currentEndDate, original);
  }, [currentEndDate, project.deadline]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "left" | "right") => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(type);
      onDragStart();
      dragStartRef.current = { x: e.clientX, left: localLeft, width: localWidth };
    },
    [localLeft, localWidth, onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartRef.current.x;

      if (isDragging === "move") {
        setLocalLeft(Math.max(0, dragStartRef.current.left + delta));
      } else if (isDragging === "left") {
        const newLeft = Math.max(0, dragStartRef.current.left + delta);
        const newWidth = dragStartRef.current.width - delta;
        if (newWidth >= 40) {
          setLocalLeft(newLeft);
          setLocalWidth(newWidth);
        }
      } else if (isDragging === "right") {
        const newWidth = Math.max(40, dragStartRef.current.width + delta);
        setLocalWidth(newWidth);
      }
    };

    const handleMouseUp = async () => {
      if (isDragging) {
        // Calculate new dates
        const newStartDate = positionToDate(localLeft);
        const newEndDate = positionToDate(localLeft + localWidth);

        // Persist changes
        try {
          await updateProjectDates(project.id, {
            startDate: newStartDate.toISOString(),
            deadline: newEndDate.toISOString(),
          });
        } catch (error) {
          // Revert on error
          setLocalLeft(left);
          setLocalWidth(width);
        }
      }

      setIsDragging(null);
      onDragEnd();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, localLeft, localWidth, positionToDate, project.id, left, width, onDragEnd]);

  return (
    <div
      className={cn(
        "absolute top-3 bottom-3 rounded-md group",
        "transition-all duration-75",
        isEstimated
          ? "bg-muted/50 border border-dashed border-muted-foreground/40"
          : "bg-muted",
        (isDragging === "left" || isDragging === "right") && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg",
        isDragging === "move" && "shadow-lg scale-[1.02] cursor-grabbing"
      )}
      style={{ left: localLeft, width: localWidth }}
    >
      {/* Drag handle - left edge (changes start date) */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-3 cursor-col-resize rounded-l-md",
          "flex items-center justify-center",
          "transition-all duration-100",
          hoveringEdge === "left" && !isDragging && "bg-primary/20",
          isDragging === "left" && "bg-primary/40 w-4"
        )}
        onMouseDown={(e) => handleMouseDown(e, "left")}
        onMouseEnter={() => setHoveringEdge("left")}
        onMouseLeave={() => setHoveringEdge(null)}
      >
        <div className={cn(
          "flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity",
          (hoveringEdge === "left" || isDragging === "left") && "!opacity-100"
        )}>
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
        </div>
      </div>

      {/* Start date tooltip */}
      {isDragging === "left" && (
        <div className="absolute -top-10 left-0 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-popover border border-border rounded-md shadow-lg px-2.5 py-1.5 whitespace-nowrap">
            <div className="text-xs font-semibold text-foreground">
              {format(currentStartDate, "MMM d, yyyy")}
            </div>
            {startDaysDiff !== 0 && (
              <div className={cn(
                "text-[10px] font-medium",
                startDaysDiff > 0 ? "text-warning" : "text-success"
              )}>
                {startDaysDiff > 0 ? `+${startDaysDiff}` : startDaysDiff} days
              </div>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-popover border-r border-b border-border transform rotate-45" />
        </div>
      )}

      {/* Main bar content (draggable to move) */}
      <div
        className={cn(
          "absolute inset-x-3 inset-y-0 flex items-center px-2 overflow-hidden rounded-md",
          isDragging === "move" ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <span className="text-xs font-medium text-foreground truncate">
          {project.name}
        </span>
      </div>

      {/* Drag handle - right edge (changes deadline) */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize rounded-r-md",
          "flex items-center justify-center",
          "transition-all duration-100",
          hoveringEdge === "right" && !isDragging && "bg-primary/20",
          isDragging === "right" && "bg-primary/40 w-4"
        )}
        onMouseDown={(e) => handleMouseDown(e, "right")}
        onMouseEnter={() => setHoveringEdge("right")}
        onMouseLeave={() => setHoveringEdge(null)}
      >
        <div className={cn(
          "flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity",
          (hoveringEdge === "right" || isDragging === "right") && "!opacity-100"
        )}>
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
        </div>
      </div>

      {/* End date tooltip */}
      {isDragging === "right" && (
        <div className="absolute -top-10 right-0 transform translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-popover border border-border rounded-md shadow-lg px-2.5 py-1.5 whitespace-nowrap">
            <div className="text-xs font-semibold text-foreground">
              {format(currentEndDate, "MMM d, yyyy")}
            </div>
            {endDaysDiff !== 0 && (
              <div className={cn(
                "text-[10px] font-medium",
                endDaysDiff > 0 ? "text-warning" : "text-success"
              )}>
                {endDaysDiff > 0 ? `+${endDaysDiff}` : endDaysDiff} days
              </div>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-popover border-r border-b border-border transform rotate-45" />
        </div>
      )}
    </div>
  );
}
