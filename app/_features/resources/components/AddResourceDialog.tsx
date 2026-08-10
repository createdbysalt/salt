"use client";

import { useCallback, useEffect, useState, useTransition, useRef } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  GitFork,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Search,
  Star,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { detectResourceFromUrl } from "@/app/_lib/resources/url-detector";
import { RESOURCE_TYPE_LABELS } from "@/app/_lib/resources/types";
import { getResourceIcon } from "@/app/_lib/resources/icons";
import { addResource, fetchResourcePreview } from "../actions";
import {
  fetchLinkCandidates,
  type LinkCandidate,
  type LinkCandidateType,
} from "@/app/_features/memory/actions/connections";
import type { ResourceDetectionResult } from "@/app/_lib/resources/types";

interface RichPreview {
  title?: string;
  description?: string;
  stats?: Record<string, number | string>;
}

type ResourceInputMode = "link" | "upload";

type EntityType = "person" | "org" | "work" | "billing" | "meeting" | "note" | "space";

type AddResourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  onAdded?: (resourceId: string) => void;
};

const TYPE_META: Record<
  LinkCandidateType,
  { label: string; icon: typeof User }
> = {
  person: { label: "Person", icon: User },
  org: { label: "Organization", icon: Building2 },
  work: { label: "Work", icon: Briefcase },
  billing: { label: "Billing", icon: CreditCard },
  meeting: { label: "Meeting", icon: Calendar },
  conversation: { label: "Conversation", icon: MessageSquare },
  resource: { label: "Resource", icon: LinkIcon },
};

export function AddResourceDialog({
  open,
  onOpenChange,
  entityType: initialEntityType,
  entityId: initialEntityId,
  entityName: initialEntityName,
  onAdded,
}: AddResourceDialogProps) {
  const [inputMode, setInputMode] = useState<ResourceInputMode>("link");
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [liveMode, setLiveMode] = useState<"static" | "live">("static");
  const [detection, setDetection] = useState<ResourceDetectionResult | null>(null);
  const [richPreview, setRichPreview] = useState<RichPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entity linking state
  const [showEntityPicker, setShowEntityPicker] = useState(!!initialEntityType);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: EntityType;
    id: string;
    name: string;
  } | null>(
    initialEntityType && initialEntityId && initialEntityName
      ? { type: initialEntityType, id: initialEntityId, name: initialEntityName }
      : null
  );
  const [entityQuery, setEntityQuery] = useState("");
  const [entityCandidates, setEntityCandidates] = useState<LinkCandidate[]>([]);
  const [isLoadingEntities, startEntityTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setInputMode("link");
      setUrl("");
      setDisplayName("");
      setDescription("");
      setLiveMode("static");
      setDetection(null);
      setRichPreview(null);
      setIsLoadingPreview(false);
      setShowEntityPicker(!!initialEntityType);
      setSelectedEntity(
        initialEntityType && initialEntityId && initialEntityName
          ? { type: initialEntityType, id: initialEntityId, name: initialEntityName }
          : null
      );
      setEntityQuery("");
      setEntityCandidates([]);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    }
  }, [open, initialEntityType, initialEntityId, initialEntityName]);

  // Load entity candidates when picker is opened
  useEffect(() => {
    if (!showEntityPicker || selectedEntity) return;
    startEntityTransition(async () => {
      const result = await fetchLinkCandidates({
        recordKind: "resource",
        recordId: "new",
        existingConnections: [],
      });
      setEntityCandidates(result);
    });
  }, [showEntityPicker, selectedEntity]);

  const filteredEntities = entityCandidates.filter((c) => {
    if (!entityQuery.trim()) return true;
    const hay = `${c.name} ${c.subtitle ?? ""}`.toLowerCase();
    return hay.includes(entityQuery.toLowerCase());
  });

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    const trimmed = value.trim();

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (trimmed.length > 10) {
      const result = detectResourceFromUrl(trimmed);
      setDetection(result);
      setRichPreview(null);

      if (result?.suggestedName && !displayName) {
        setDisplayName(result.suggestedName);
      }

      if (result && ["github_repo", "github_pr", "github_issue"].includes(result.resourceType)) {
        setIsLoadingPreview(true);
        previewTimeoutRef.current = setTimeout(async () => {
          try {
            const preview = await fetchResourcePreview(trimmed);
            if (preview.success && preview.metadata) {
              setRichPreview({
                title: preview.metadata.title,
                description: preview.metadata.description,
                stats: preview.metadata.stats as Record<string, number | string>,
              });
              if (preview.metadata.title && !displayName) {
                setDisplayName(preview.metadata.title);
              }
            }
          } finally {
            setIsLoadingPreview(false);
          }
        }, 500);
      }
    } else {
      setDetection(null);
      setRichPreview(null);
    }
  }, [displayName]);

  const handleSubmit = () => {
    if (inputMode === "link" && !url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    startTransition(async () => {
      const result = await addResource({
        entityType: selectedEntity?.type,
        entityId: selectedEntity?.id,
        resourceUrl: url.trim(),
        displayName: displayName.trim() || undefined,
        description: description.trim() || undefined,
        mode: liveMode,
        source: "manual",
      });

      if (result.success) {
        toast.success("Resource added");
        onAdded?.(result.resourceId!);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to add resource");
      }
    });
  };

  const Icon = detection?.resourceType
    ? getResourceIcon(detection.resourceType)
    : LinkIcon;

  const hasEntity = !!selectedEntity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            {hasEntity
              ? `Add a resource to ${selectedEntity.name}`
              : "Add a document or link to your workspace"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle: Upload vs Link */}
          <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
                inputMode === "upload"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="size-4" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setInputMode("link")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
                inputMode === "link"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LinkIcon className="size-4" />
              Link
            </button>
          </div>

          {/* Upload mode */}
          {inputMode === "upload" && (
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-8 text-center">
              <Upload className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-foreground">
                Drop files here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, images, documents up to 10MB
              </p>
              <input
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={() => toast("File upload coming soon")}
              />
            </div>
          )}

          {/* Link mode */}
          {inputMode === "link" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="resource-url">URL</Label>
                <div className="relative">
                  <Input
                    id="resource-url"
                    type="url"
                    placeholder="Paste URL (GitHub, Figma, Linear, etc.)"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="pr-10"
                    autoComplete="off"
                  />
                  {detection && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <Check className="size-4 text-success" />
                    </div>
                  )}
                </div>
              </div>

              {detection && (
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {richPreview?.title || RESOURCE_TYPE_LABELS[detection.resourceType]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {richPreview?.description || detection.suggestedName || RESOURCE_TYPE_LABELS[detection.resourceType]}
                      </p>
                    </div>
                    {isLoadingPreview ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : detection.supportsLive ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Live supported
                      </span>
                    ) : null}
                  </div>

                  {richPreview?.stats && (
                    <div className="mt-2 flex flex-wrap gap-3 border-t border-border/40 pt-2">
                      {richPreview.stats.stars !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="size-3" />
                          {richPreview.stats.stars.toLocaleString()}
                        </span>
                      )}
                      {richPreview.stats.forks !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <GitFork className="size-3" />
                          {richPreview.stats.forks.toLocaleString()}
                        </span>
                      )}
                      {richPreview.stats.issues !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="size-3" />
                          {richPreview.stats.issues} issues
                        </span>
                      )}
                      {richPreview.stats.language && (
                        <span className="text-xs text-muted-foreground">
                          {richPreview.stats.language}
                        </span>
                      )}
                      {richPreview.stats.state && (
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-xs font-medium",
                          richPreview.stats.state === "open" && "bg-success/10 text-success",
                          richPreview.stats.state === "closed" && "bg-destructive/10 text-destructive",
                          richPreview.stats.state === "merged" && "bg-violet/15 text-violet"
                        )}>
                          {richPreview.stats.state}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="resource-name">Display name</Label>
            <Input
              id="resource-name"
              placeholder="Optional custom name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              placeholder="Optional notes about this resource"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Entity picker section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowEntityPicker(!showEntityPicker)}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-left transition hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedEntity ? `Linked to ${selectedEntity.name}` : "Link to entity (optional)"}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  showEntityPicker && "rotate-180"
                )}
              />
            </button>

            {showEntityPicker && !selectedEntity && (
              <div className="rounded-xl border border-border/60 bg-card/50 p-3 space-y-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <Input
                    value={entityQuery}
                    onChange={(e) => setEntityQuery(e.target.value)}
                    placeholder="Search people, work, orgs…"
                    className="pl-9 h-9 rounded-full bg-muted/40 border-border/60"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {isLoadingEntities ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredEntities.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {entityCandidates.length === 0 ? "No entities found" : "No matches"}
                    </p>
                  ) : (
                    filteredEntities.slice(0, 10).map((candidate) => {
                      const meta = TYPE_META[candidate.type] || TYPE_META.resource;
                      const CandidateIcon = meta.icon;
                      return (
                        <button
                          key={`${candidate.type}-${candidate.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedEntity({
                              type: candidate.type as EntityType,
                              id: candidate.id,
                              name: candidate.name,
                            });
                            setEntityQuery("");
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/60 transition"
                        >
                          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                            <CandidateIcon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {candidate.name}
                            </p>
                            {candidate.subtitle && (
                              <p className="truncate text-xs text-muted-foreground">
                                {candidate.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {meta.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {selectedEntity && (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-success/5 px-3 py-2">
                <Check className="size-4 text-success" />
                <span className="flex-1 text-sm text-foreground">
                  Will be linked to <span className="font-medium">{selectedEntity.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  className="rounded-full p-1 hover:bg-muted transition"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Live mode toggle */}
          {inputMode === "link" && detection?.supportsLive && (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="live-mode" className="text-sm font-medium">
                  Live mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Monitor activity and sync status updates
                </p>
              </div>
              <Switch
                id="live-mode"
                checked={liveMode === "live"}
                onCheckedChange={(checked) => setLiveMode(checked ? "live" : "static")}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={(inputMode === "link" && !url.trim()) || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                {inputMode === "upload" ? (
                  <Upload className="mr-2 size-4" />
                ) : (
                  <LinkIcon className="mr-2 size-4" />
                )}
                Add Resource
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
