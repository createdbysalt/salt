"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { cn } from "@repo/utils";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  CircleDot,
  Settings2,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  startOfDay,
  differenceInDays,
  differenceInWeeks,
  format,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  isPast,
} from "date-fns";
import { updateMilestone } from "@/app/_features/projects/actions";

// ============================================================================
// Types
// ============================================================================

type ZoomLevel = "week" | "month" | "quarter";

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: "not_started" | "pending" | "in_progress" | "complete";
  dueAt: string | null;
  completedAt: string | null;
  orderIndex: number;
  taskProgress?: {
    completed: number;
    total: number;
  };
}

interface ProjectDetailTimelineProps {
  projectId: string;
  milestones: Milestone[];
  projectStartDate?: string | null;
  projectDeadline?: string | null;
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
    unitWidth: 80,
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
    unitWidth: 28,
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
    unitWidth: 20,
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
};

const STATUS_CONFIG = {
  not_started: {
    icon: Circle,
    color: "text-muted-foreground",
    barColor: "bg-muted",
  },
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    barColor: "bg-muted",
  },
  in_progress: {
    icon: CircleDot,
    color: "text-info",
    barColor: "bg-info/30",
  },
  complete: {
    icon: CheckCircle2,
    color: "text-success",
    barColor: "bg-success/30",
  },
};

const ROW_HEIGHT = 56;
const LEFT_PANEL_WIDTH = 280;

// ============================================================================
// Main Component
// ============================================================================

export function ProjectDetailTimeline({
  projectId,
  milestones,
  projectStartDate,
  projectDeadline,
}: ProjectDetailTimelineProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort milestones by due date, then by order index
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return a.orderIndex - b.orderIndex;
    });
  }, [milestones]);

  // Calculate timeline range
  const { rangeStart, rangeEnd, timeUnits, totalWidth } = useMemo(() => {
    const config = ZOOM_CONFIG[zoom];
    const now = new Date();

    let minDate = projectStartDate ? parseISO(projectStartDate) : now;
    let maxDate = projectDeadline ? parseISO(projectDeadline) : now;

    sortedMilestones.forEach((m) => {
      if (m.dueAt) {
        const due = parseISO(m.dueAt);
        if (isValid(due)) {
          if (isBefore(due, minDate)) minDate = due;
          if (isAfter(due, maxDate)) maxDate = due;
        }
      }
      if (m.completedAt) {
        const completed = parseISO(m.completedAt);
        if (isValid(completed)) {
          if (isBefore(completed, minDate)) minDate = completed;
          if (isAfter(completed, maxDate)) maxDate = completed;
        }
      }
    });

    // Add padding - extend further to the right to fill viewport
    const paddingDays = zoom === "quarter" ? 30 : zoom === "month" ? 14 : 7;
    const endPaddingDays = zoom === "quarter" ? 90 : zoom === "month" ? 60 : 30; // More padding to fill screen
    const paddedStart = addDays(minDate, -paddingDays);
    const paddedEnd = addDays(maxDate, endPaddingDays);

    const units = config.getUnits(paddedStart, paddedEnd);
    const width = units.length * config.unitWidth;

    return {
      rangeStart: paddedStart,
      rangeEnd: paddedEnd,
      timeUnits: units,
      totalWidth: width,
    };
  }, [sortedMilestones, projectStartDate, projectDeadline, zoom]);

  // Calculate today position
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (isBefore(today, rangeStart) || isAfter(today, rangeEnd)) return null;

    const config = ZOOM_CONFIG[zoom];
    if (zoom === "quarter") {
      return Math.floor(differenceInDays(today, rangeStart) / 7) * config.unitWidth;
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

    const zoomLevels: ZoomLevel[] = ["week", "month", "quarter"];

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

  // Get milestone bar position (from start to due date)
  const getMilestoneBar = useCallback(
    (milestone: Milestone, prevMilestone: Milestone | null) => {
      if (!milestone.dueAt) return null;

      const config = ZOOM_CONFIG[zoom];
      const dueDate = parseISO(milestone.dueAt);

      // Bar starts from previous milestone or project start
      let startDate: Date;
      if (prevMilestone?.dueAt) {
        startDate = parseISO(prevMilestone.dueAt);
      } else if (projectStartDate) {
        startDate = parseISO(projectStartDate);
      } else {
        startDate = addDays(dueDate, -14); // Default 2 weeks before due
      }

      if (zoom === "quarter") {
        const startWeeks = Math.floor(differenceInDays(startDate, rangeStart) / 7);
        const endWeeks = Math.floor(differenceInDays(dueDate, rangeStart) / 7);
        return {
          left: startWeeks * config.unitWidth,
          width: Math.max(40, (endWeeks - startWeeks) * config.unitWidth),
        };
      }

      const startDays = differenceInDays(startDate, rangeStart);
      const endDays = differenceInDays(dueDate, rangeStart);

      return {
        left: Math.max(0, startDays * config.unitWidth),
        width: Math.max(40, (endDays - startDays) * config.unitWidth),
      };
    },
    [zoom, rangeStart, projectStartDate]
  );

  if (milestones.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No milestones found</p>
          <p className="text-sm mt-1">Add milestones to see them on the timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-background min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            onClick={scrollToToday}
          >
            Today
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8 gap-1.5">
                {ZOOM_CONFIG[zoom].label}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(["quarter", "month", "week"] as const).map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setZoom(level)}
                  className="justify-between"
                >
                  <span>{ZOOM_CONFIG[level].label}</span>
                  <span className="text-muted-foreground text-xs ml-4">
                    {ZOOM_CONFIG[level].shortcut}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Display
        </Button>
      </div>

      {/* Timeline Grid - fills entire viewport below header */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel (sticky) */}
        <div
          className="shrink-0 border-r bg-background overflow-y-auto flex flex-col"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header spacer */}
          <div className="h-10 border-b shrink-0" />

          {/* Milestone rows */}
          {sortedMilestones.map((milestone) => {
            const statusConfig = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.not_started;
            const StatusIcon = statusConfig.icon;
            const isOverdue =
              milestone.dueAt &&
              isPast(parseISO(milestone.dueAt)) &&
              milestone.status !== "complete";

            return (
              <div
                key={milestone.id}
                className="flex items-center gap-3 px-4 hover:bg-muted/50 transition-colors border-b shrink-0"
                style={{ height: ROW_HEIGHT }}
              >
                <StatusIcon className={cn("h-4 w-4 shrink-0", statusConfig.color)} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-sm font-medium truncate",
                      milestone.status === "complete" && "text-muted-foreground line-through"
                    )}
                  >
                    {milestone.title}
                  </div>
                  {milestone.dueAt && (
                    <div className={cn("text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                      {format(parseISO(milestone.dueAt), "MMM d")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Fill remaining space in left panel */}
          <div className="flex-1 min-h-[200px]" />
        </div>

        {/* Right Panel (scrollable) */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto">
          <div style={{ width: totalWidth, minWidth: "100%" }} className="flex flex-col min-h-full">
            {/* Time axis */}
            <TimeAxis units={timeUnits} zoom={zoom} />

            {/* Milestone bars area - grows to fill viewport */}
            <div className="relative flex-1" style={{ minHeight: Math.max(sortedMilestones.length * ROW_HEIGHT + 200, 400) }}>
              {/* Vertical grid lines (dashed) - extend to full height */}
              <GridLines units={timeUnits} zoom={zoom} minHeight={Math.max(sortedMilestones.length * ROW_HEIGHT + 400, 600)} />

              {/* Today line - extends full height */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 w-0.5 bg-primary z-20 pointer-events-none"
                  style={{ left: todayPosition, height: "100%" }}
                />
              )}

              {/* Milestone bars */}
              {sortedMilestones.map((milestone, idx) => {
                const prevMilestone = idx > 0 ? sortedMilestones[idx - 1] : null;
                const barPos = getMilestoneBar(milestone, prevMilestone);
                const statusConfig = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.not_started;

                return (
                  <div
                    key={milestone.id}
                    className="relative border-b border-border/30"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {barPos && (
                      <DraggableMilestoneBar
                        milestone={milestone}
                        barColor={statusConfig.barColor}
                        left={barPos.left}
                        width={barPos.width}
                        zoom={zoom}
                        rangeStart={rangeStart}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
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
}

function TimeAxis({ units, zoom }: TimeAxisProps) {
  const config = ZOOM_CONFIG[zoom];

  // Group by month for header - only show year when it changes
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

  return (
    <div className="h-10 border-b flex flex-col sticky top-0 bg-background z-10">
      {/* Month headers */}
      <div className="flex h-5 border-b border-border/50">
        {monthGroups.map((group, idx) => (
          <div
            key={idx}
            className="flex items-center px-2 text-xs font-medium text-muted-foreground border-r border-border/30"
            style={{ width: group.count * config.unitWidth }}
          >
            {group.month.toUpperCase()}
            {group.showYear && <span className="ml-1 text-muted-foreground/70">{group.year}</span>}
          </div>
        ))}
      </div>

      {/* Day/week indicators */}
      <div className="flex h-5">
        {units.map((unit, idx) => {
          const isToday = format(unit, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

          // Only show labels at intervals
          const showLabel =
            zoom === "quarter" ||
            (zoom === "month" && (unit.getDate() === 1 || unit.getDate() % 7 === 0)) ||
            zoom === "week";

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-center text-[10px]",
                isToday ? "text-primary font-semibold bg-primary/10" : "text-muted-foreground"
              )}
              style={{ width: config.unitWidth }}
            >
              {isToday ? (
                <span className="bg-primary text-primary-foreground px-1 py-0.5 rounded text-[10px] font-semibold">
                  {format(today, "d")}
                </span>
              ) : (
                showLabel && config.formatHeader(unit)
              )}
            </div>
          );
        })}
      </div>
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
        const isMonthStart = unit.getDate() === 1;
        const isWeekStart = unit.getDay() === 0;

        const showLine =
          zoom === "quarter" ||
          (zoom === "month" && (isMonthStart || isWeekStart)) ||
          zoom === "week";

        if (!showLine) return null;

        return (
          <div
            key={idx}
            className={cn(
              "absolute top-0 bottom-0 border-l",
              isMonthStart ? "border-border/60" : "border-border/20 border-dashed"
            )}
            style={{ left: idx * config.unitWidth }}
          />
        );
      })}
    </div>
  );
}

interface DraggableMilestoneBarProps {
  milestone: Milestone;
  barColor: string;
  left: number;
  width: number;
  zoom: ZoomLevel;
  rangeStart: Date;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function DraggableMilestoneBar({
  milestone,
  barColor,
  left,
  width,
  zoom,
  rangeStart,
  onDragStart,
  onDragEnd,
}: DraggableMilestoneBarProps) {
  const [localLeft, setLocalLeft] = useState(left);
  const [localWidth, setLocalWidth] = useState(width);
  const [isDragging, setIsDragging] = useState<"move" | "right" | null>(null);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
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
      if (zoom === "quarter") {
        return addWeeks(rangeStart, Math.round(pos / config.unitWidth));
      }
      return addDays(rangeStart, Math.round(pos / config.unitWidth));
    },
    [zoom, rangeStart, config.unitWidth]
  );

  // Calculate the current due date being shown (for tooltip)
  const currentDueDate = useMemo(() => {
    return positionToDate(localLeft + localWidth);
  }, [positionToDate, localLeft, localWidth]);

  // Calculate days difference from original
  const daysDiff = useMemo(() => {
    if (!milestone.dueAt) return 0;
    const originalDue = parseISO(milestone.dueAt);
    return differenceInDays(currentDueDate, originalDue);
  }, [currentDueDate, milestone.dueAt]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "right") => {
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
        setLocalWidth(dragStartRef.current.width); // Keep width same
      } else if (isDragging === "right") {
        const newWidth = Math.max(40, dragStartRef.current.width + delta);
        setLocalWidth(newWidth);
      }
    };

    const handleMouseUp = async () => {
      if (isDragging) {
        // Calculate new due date (right edge of bar)
        const newDueDate = positionToDate(localLeft + localWidth);

        // Persist changes
        try {
          const result = await updateMilestone({
            id: milestone.id,
            due_at: newDueDate.toISOString(),
          });
          if (result.error) {
            // Revert on error
            setLocalLeft(left);
            setLocalWidth(width);
          }
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
  }, [isDragging, localLeft, localWidth, positionToDate, milestone.id, left, width, onDragEnd]);

  return (
    <div
      className={cn(
        "absolute top-3 bottom-3 rounded-md group",
        barColor,
        "transition-all duration-75",
        isDragging === "right" && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg",
        isDragging === "move" && "shadow-lg scale-[1.02] cursor-grabbing"
      )}
      style={{ left: localLeft, width: localWidth }}
    >
      {/* Main bar content (draggable to move entire bar) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center px-3 overflow-hidden rounded-md",
          isDragging === "move" ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        <span className="text-xs font-medium text-foreground truncate">
          {milestone.title}
        </span>
      </div>

      {/* Drag handle - right edge (changes due date) */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize rounded-r-md",
          "flex items-center justify-center",
          "transition-all duration-100",
          isHoveringHandle && !isDragging && "bg-primary/20",
          isDragging === "right" && "bg-primary/40 w-4"
        )}
        onMouseDown={(e) => handleMouseDown(e, "right")}
        onMouseEnter={() => setIsHoveringHandle(true)}
        onMouseLeave={() => setIsHoveringHandle(false)}
      >
        {/* Grip lines indicator */}
        <div className={cn(
          "flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity",
          (isHoveringHandle || isDragging === "right") && "!opacity-100"
        )}>
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
          <div className="w-0.5 h-2 bg-foreground/60 rounded-full" />
        </div>
      </div>

      {/* Date tooltip - shows when dragging right edge */}
      {isDragging === "right" && (
        <div
          className="absolute -top-10 right-0 transform translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-popover border border-border rounded-md shadow-lg px-2.5 py-1.5 whitespace-nowrap">
            <div className="text-xs font-semibold text-foreground">
              {format(currentDueDate, "MMM d, yyyy")}
            </div>
            {daysDiff !== 0 && (
              <div className={cn(
                "text-[10px] font-medium",
                daysDiff > 0 ? "text-warning" : "text-success"
              )}>
                {daysDiff > 0 ? `+${daysDiff}` : daysDiff} days
              </div>
            )}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-popover border-r border-b border-border transform rotate-45" />
        </div>
      )}
    </div>
  );
}
