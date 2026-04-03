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

// Lifecycle stages
type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

const STAGES: LifecycleStage[] = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];

const STAGE_CONFIG: Record<LifecycleStage, { label: string; dotClass: string }> = {
  lead: { label: "Inquiry", dotClass: "bg-muted-foreground" },
  discovery: { label: "Discovery", dotClass: "bg-muted-foreground" },
  pitch: { label: "Pitch", dotClass: "bg-amber-500" },
  active: { label: "Client", dotClass: "bg-blue-500" },
  complete: { label: "Complete", dotClass: "bg-green-500" },
  on_hold: { label: "On Hold", dotClass: "bg-amber-500" },
  lost: { label: "Lost", dotClass: "bg-red-500" },
};

interface ClientForBoard {
  id: string;
  name: string;
  contactEmail: string | null;
  company?: { id: string; name: string } | null;
  lifecycleStage?: LifecycleStage;
  ltv?: number;
}

interface ClientsBoardViewProps {
  clients: ClientForBoard[];
}

// Minimal Pipeline Card (matches grid view)
function PipelineCard({
  client,
  isDragging = false,
}: {
  client: ClientForBoard;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subtitle = client.company?.name || client.contactEmail;

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
            {client.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <Link
          href={`/studio/clients/${client.id}`}
          className="min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-medium text-[13px] leading-tight truncate hover:text-primary transition-colors">
            {client.name}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </Link>

        {/* LTV */}
        {client.ltv != null && client.ltv > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${client.ltv.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Static card for drag overlay
function DragOverlayCard({ client }: { client: ClientForBoard }) {
  const subtitle = client.company?.name || client.contactEmail;

  return (
    <div className="block rounded-md border bg-card p-3 shadow-lg scale-[1.02] cursor-grabbing w-[250px]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          <GripVertical className="size-4 text-muted-foreground" />
        </div>
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-medium">
            {client.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[13px] leading-tight truncate">
            {client.name}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {client.ltv != null && client.ltv > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${client.ltv.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Pipeline Column
function PipelineColumn({
  stage,
  clients,
  isHovered = false,
}: {
  stage: LifecycleStage;
  clients: ClientForBoard[];
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
          <span className="text-muted-foreground text-sm">{clients.length}</span>
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
          items={clients.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {clients.map((client) => (
            <PipelineCard key={client.id} client={client} />
          ))}
        </SortableContext>

        {clients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No clients
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientsBoardView({ clients }: ClientsBoardViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<LifecycleStage | null>(null);
  const [hoveredStage, setHoveredStage] = useState<LifecycleStage | null>(null);

  // Group clients by stage
  const getClientsByStage = (): Record<LifecycleStage, ClientForBoard[]> => {
    const grouped: Record<LifecycleStage, ClientForBoard[]> = {
      lead: [],
      discovery: [],
      pitch: [],
      active: [],
      complete: [],
      on_hold: [],
      lost: [],
    };

    for (const client of clients) {
      const stage = (client.lifecycleStage || "lead") as LifecycleStage;
      if (grouped[stage]) {
        grouped[stage].push(client);
      } else {
        grouped.lead.push(client);
      }
    }

    return grouped;
  };

  const [localClientsByStage, setLocalClientsByStage] = useState(getClientsByStage);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalClientsByStage(getClientsByStage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

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

  const findStageByClientId = (clientId: string): LifecycleStage | null => {
    for (const stage of STAGES) {
      if (localClientsByStage[stage].some((c) => c.id === clientId)) {
        return stage;
      }
    }
    return null;
  };

  const getActiveClient = (): ClientForBoard | null => {
    if (!activeId) return null;
    for (const stage of STAGES) {
      const client = localClientsByStage[stage].find((c) => c.id === activeId);
      if (client) return client;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const clientId = event.active.id as string;
    setActiveId(clientId);
    setOriginalStage(findStageByClientId(clientId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeClientId = active.id as string;
    const overId = over.id as string;

    const sourceStage = findStageByClientId(activeClientId);
    let destStage: LifecycleStage | null = null;

    if (STAGES.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      destStage = findStageByClientId(overId);
    }

    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

    setLocalClientsByStage((prev) => {
      const client = prev[sourceStage].find((c) => c.id === activeClientId);
      if (!client) return prev;

      const newState = { ...prev };
      newState[sourceStage] = prev[sourceStage].filter((c) => c.id !== activeClientId);
      newState[destStage!] = [...prev[destStage!], { ...client, lifecycleStage: destStage! }];

      return newState;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedClientId = active.id as string;
    const sourceStage = originalStage;

    setActiveId(null);
    setOriginalStage(null);
    setHoveredStage(null);

    if (!over || !sourceStage) return;

    const overId = over.id as string;

    let destStage: LifecycleStage;
    if (STAGES.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      const overStage = findStageByClientId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    if (sourceStage !== destStage) {
      const result = await updateClientLifecycleStage(draggedClientId, destStage);
      if (!result.success) {
        toast.error(result.error || "Failed to move client");
        setLocalClientsByStage(getClientsByStage());
      } else {
        toast.success(`Moved to ${STAGE_CONFIG[destStage].label}`);
        router.refresh();
      }
    }
  };

  // SSR fallback
  if (!mounted) {
    const clientsByStage = getClientsByStage();
    return (
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm shrink-0">
              <span className={cn("size-2 rounded-full", STAGE_CONFIG[stage].dotClass)} />
              <span className="font-medium">{STAGE_CONFIG[stage].label}</span>
              <span className="text-muted-foreground">{clientsByStage[stage].length}</span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3 overflow-y-auto">
              {clientsByStage[stage].map((client) => (
                <div key={client.id} className="bg-card rounded-md border p-3">
                  <div className="font-medium text-sm truncate">{client.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeClient = getActiveClient();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            clients={localClientsByStage[stage]}
            isHovered={hoveredStage === stage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeClient ? <DragOverlayCard client={activeClient} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
