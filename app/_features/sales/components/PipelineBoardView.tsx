"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { updateClientLifecycleStage } from "@/app/actions/clients/update-client";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

// Full sales pipeline stages
type PipelineStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

const PIPELINE_STAGES: PipelineStage[] = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];

const STAGE_CONFIG: Record<PipelineStage, { label: string; dotClass: string }> = {
  lead: { label: "Inquiry", dotClass: "bg-[#6b9cff]" }, // Ocean
  discovery: { label: "Discovery", dotClass: "bg-[#b8b3ff]" }, // Violet
  pitch: { label: "Pitch", dotClass: "bg-[#ff7b54]" }, // Rose
  active: { label: "Active", dotClass: "bg-[#3fb892]" }, // Emerald
  complete: { label: "Complete", dotClass: "bg-[#3fb892]" }, // Emerald
  on_hold: { label: "On Hold", dotClass: "bg-warning" },
  lost: { label: "Lost", dotClass: "bg-destructive" },
};

interface LeadForBoard {
  id: string;
  name: string;
  contactEmail: string | null;
  company?: { id: string; name: string } | null;
  lifecycleStage?: string;
  ltv?: number;
}

interface PipelineBoardViewProps {
  leads: LeadForBoard[];
}

// Pipeline Card
function PipelineCard({
  lead,
  isDragging = false,
}: {
  lead: LeadForBoard;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subtitle = lead.company?.name || lead.contactEmail;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group block rounded-md border bg-card p-3 transition-all",
        isDragging || isSortableDragging
          ? "opacity-90 shadow-lg scale-[1.02] cursor-grabbing"
          : "hover:bg-muted/50 cursor-grab"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </button>

        {/* Avatar */}
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-medium">
            {lead.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <Link
          href={`/clients/${lead.id}`}
          className="min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-medium text-[13px] leading-tight truncate hover:text-primary transition-colors">
            {lead.name}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </Link>

        {/* LTV */}
        {lead.ltv != null && lead.ltv > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${lead.ltv.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Drag Overlay Card
function DragOverlayCard({ lead }: { lead: LeadForBoard }) {
  const subtitle = lead.company?.name || lead.contactEmail;

  return (
    <div className="block rounded-md border bg-card p-3 shadow-lg scale-[1.02] cursor-grabbing w-[250px]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          <GripVertical className="size-4 text-muted-foreground" />
        </div>
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-medium">
            {lead.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[13px] leading-tight truncate">
            {lead.name}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {lead.ltv != null && lead.ltv > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${lead.ltv.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Pipeline Column
function PipelineColumn({
  stage,
  leads,
  isHovered = false,
}: {
  stage: PipelineStage;
  leads: LeadForBoard[];
  isHovered?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stage });
  const config = STAGE_CONFIG[stage];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg transition-all duration-200",
        isHovered ? "bg-accent/50 ring-2 ring-accent/30 ring-inset" : "bg-muted/30"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", config.dotClass)} />
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-muted-foreground text-sm">{leads.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 px-2 pb-3 min-h-0">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <PipelineCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No clients
          </div>
        )}
      </div>
    </div>
  );
}

export function PipelineBoardView({ leads }: PipelineBoardViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<PipelineStage | null>(null);
  const [hoveredStage, setHoveredStage] = useState<PipelineStage | null>(null);

  // Group leads by stage (all pipeline stages)
  const getLeadsByStage = (): Record<PipelineStage, LeadForBoard[]> => {
    const grouped: Record<PipelineStage, LeadForBoard[]> = {
      lead: [],
      discovery: [],
      pitch: [],
      active: [],
      complete: [],
      on_hold: [],
      lost: [],
    };

    for (const item of leads) {
      const stage = item.lifecycleStage as PipelineStage;
      if (PIPELINE_STAGES.includes(stage)) {
        grouped[stage].push(item);
      } else {
        // Default to lead if stage not recognized
        grouped.lead.push(item);
      }
    }

    return grouped;
  };

  const [localLeadsByStage, setLocalLeadsByStage] = useState(getLeadsByStage);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalLeadsByStage(getLeadsByStage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findStageByLeadId = (leadId: string): PipelineStage | null => {
    for (const stage of PIPELINE_STAGES) {
      if (localLeadsByStage[stage].some((l) => l.id === leadId)) {
        return stage;
      }
    }
    return null;
  };

  const getActiveLead = (): LeadForBoard | null => {
    if (!activeId) return null;
    for (const stage of PIPELINE_STAGES) {
      const lead = localLeadsByStage[stage].find((l) => l.id === activeId);
      if (lead) return lead;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = event.active.id as string;
    setActiveId(leadId);
    setOriginalStage(findStageByLeadId(leadId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const sourceStage = findStageByLeadId(activeLeadId);
    let destStage: PipelineStage | null = null;

    if (PIPELINE_STAGES.includes(overId as PipelineStage)) {
      destStage = overId as PipelineStage;
    } else {
      destStage = findStageByLeadId(overId);
    }

    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

    setLocalLeadsByStage((prev) => {
      const lead = prev[sourceStage].find((l) => l.id === activeLeadId);
      if (!lead) return prev;

      const newState = { ...prev };
      newState[sourceStage] = prev[sourceStage].filter((l) => l.id !== activeLeadId);
      newState[destStage!] = [...prev[destStage!], { ...lead, lifecycleStage: destStage! }];

      return newState;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedLeadId = active.id as string;
    const sourceStage = originalStage;

    setActiveId(null);
    setOriginalStage(null);
    setHoveredStage(null);

    if (!over || !sourceStage) return;

    const overId = over.id as string;

    let destStage: PipelineStage;
    if (PIPELINE_STAGES.includes(overId as PipelineStage)) {
      destStage = overId as PipelineStage;
    } else {
      const overStage = findStageByLeadId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    if (sourceStage !== destStage) {
      const result = await updateClientLifecycleStage(draggedLeadId, destStage);
      if (!result.success) {
        toast.error(result.error || "Failed to move lead");
        setLocalLeadsByStage(getLeadsByStage());
      } else {
        toast.success(`Moved to ${STAGE_CONFIG[destStage].label}`);
        router.refresh();
      }
    }
  };

  // SSR fallback
  if (!mounted) {
    const leadsByStage = getLeadsByStage();
    return (
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm shrink-0">
              <span className={cn("size-2 rounded-full", STAGE_CONFIG[stage].dotClass)} />
              <span className="font-medium">{STAGE_CONFIG[stage].label}</span>
              <span className="text-muted-foreground">{leadsByStage[stage].length}</span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3 overflow-y-auto">
              {leadsByStage[stage].map((lead) => (
                <div key={lead.id} className="bg-card rounded-md border p-3">
                  <div className="font-medium text-sm truncate">{lead.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeLead = getActiveLead();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            leads={localLeadsByStage[stage]}
            isHovered={hoveredStage === stage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <DragOverlayCard lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
