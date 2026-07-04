"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Archive, ArchiveRestore, Merge, Trash2 } from "lucide-react";
import {
  Button,
  Badge,
  Input,
  Label,
  Slider,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { SettingsPage } from "../SettingsPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsCard } from "../SettingsCard";
import {
  getTags,
  createTag,
  updateTag,
  archiveTag,
  unarchiveTag,
  mergeTags,
  type WorkspaceTag,
  type TagScope,
  type TagCategory,
} from "@/app/_features/memory/tags";
import {
  VOCABULARY_REGISTRY,
  type VocabularyDefinition,
} from "@/app/_features/memory/taxonomy/registry";

const SCOPE_LABELS: Record<TagScope, string> = {
  person: "People",
  org: "Organizations",
  work: "Work",
  billing: "Billing",
  file: "Files",
  all: "All",
};

const CATEGORY_LABELS: Record<TagCategory, string> = {
  segment: "Segment",
  signal: "Signal",
  priority: "Priority",
  custom: "Custom",
};

export function MemorySection() {
  const [tags, setTags] = useState<WorkspaceTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedScope, setSelectedScope] = useState<TagScope | "all">("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<WorkspaceTag | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagScope, setNewTagScope] = useState<TagScope>("all");
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>("custom");

  const [threshold, setThreshold] = useState(80);
  const [maxTags, setMaxTags] = useState(40);

  useEffect(() => {
    loadTags();
  }, [showArchived]);

  async function loadTags() {
    setIsLoading(true);
    const result = await getTags({ includeArchived: showArchived });
    if (result.success) {
      setTags(result.data);
    }
    setIsLoading(false);
  }

  const filteredTags = tags.filter((t) => {
    if (selectedScope !== "all" && t.scope !== selectedScope && t.scope !== "all") {
      return false;
    }
    return true;
  });

  const activeTags = filteredTags.filter((t) => !t.isArchived);
  const archivedTags = filteredTags.filter((t) => t.isArchived);

  async function handleCreateTag() {
    if (!newTagLabel.trim()) return;

    startTransition(async () => {
      const result = await createTag({
        label: newTagLabel.trim(),
        scope: newTagScope,
        category: newTagCategory,
      });

      if (result.success) {
        toast.success(result.action === "created" ? "Tag created" : `Tag ${result.action}`);
        setCreateDialogOpen(false);
        setNewTagLabel("");
        loadTags();
      } else {
        toast.error(result.error ?? "Failed to create tag");
      }
    });
  }

  async function handleUpdateTag() {
    if (!selectedTag || !newTagLabel.trim()) return;

    startTransition(async () => {
      const result = await updateTag(selectedTag.id, { label: newTagLabel.trim() });

      if (result.success) {
        toast.success("Tag updated");
        setEditDialogOpen(false);
        setSelectedTag(null);
        loadTags();
      } else {
        toast.error(result.error ?? "Failed to update tag");
      }
    });
  }

  async function handleArchiveTag(tag: WorkspaceTag) {
    startTransition(async () => {
      const result = tag.isArchived
        ? await unarchiveTag(tag.id)
        : await archiveTag(tag.id);

      if (result.success) {
        toast.success(tag.isArchived ? "Tag restored" : "Tag archived");
        loadTags();
      } else {
        toast.error(result.error ?? "Failed to update tag");
      }
    });
  }

  async function handleMergeTags() {
    if (!selectedTag || !mergeTargetId) return;

    startTransition(async () => {
      const result = await mergeTags(selectedTag.id, mergeTargetId);

      if (result.success) {
        toast.success(`Merged ${result.migratedCount} assignments`);
        setMergeDialogOpen(false);
        setSelectedTag(null);
        setMergeTargetId("");
        loadTags();
      } else {
        toast.error(result.error ?? "Failed to merge tags");
      }
    });
  }

  function openEditDialog(tag: WorkspaceTag) {
    setSelectedTag(tag);
    setNewTagLabel(tag.label);
    setEditDialogOpen(true);
  }

  function openMergeDialog(tag: WorkspaceTag) {
    setSelectedTag(tag);
    setMergeTargetId("");
    setMergeDialogOpen(true);
  }

  const mergeTargetOptions = activeTags.filter(
    (t) => t.id !== selectedTag?.id && !t.isSystem
  );

  return (
    <SettingsPage title="Memory">
      <SettingsSection
        title="Tags"
        description="Categorize people, organizations, and work with tags. Salt can also create tags automatically based on patterns it detects."
      >
        <SettingsCard>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedScope}
                  onValueChange={(v) => setSelectedScope(v as TagScope | "all")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scopes</SelectItem>
                    <SelectItem value="person">People</SelectItem>
                    <SelectItem value="org">Organizations</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  {showArchived ? "Hide archived" : "Show archived"}
                </Button>
              </div>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add tag
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {activeTags.length === 0 && archivedTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No tags yet. Create one to get started.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {activeTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="group flex items-center gap-1 rounded-md border bg-card px-2 py-1"
                        >
                          <Badge
                            variant={tag.isSystem ? "secondary" : "outline"}
                            className="mr-1"
                          >
                            {tag.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {SCOPE_LABELS[tag.scope]}
                          </span>
                          {!tag.isSystem && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEditDialog(tag)}
                                className="p-0.5 hover:bg-muted rounded"
                                disabled={isPending}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => openMergeDialog(tag)}
                                className="p-0.5 hover:bg-muted rounded"
                                disabled={isPending}
                              >
                                <Merge className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleArchiveTag(tag)}
                                className="p-0.5 hover:bg-muted rounded"
                                disabled={isPending}
                              >
                                <Archive className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {showArchived && archivedTags.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-xs text-muted-foreground mb-2">Archived</p>
                        <div className="flex flex-wrap gap-2">
                          {archivedTags.map((tag) => (
                            <div
                              key={tag.id}
                              className="group flex items-center gap-1 rounded-md border border-dashed bg-muted/30 px-2 py-1"
                            >
                              <span className="text-sm text-muted-foreground">
                                {tag.label}
                              </span>
                              <button
                                onClick={() => handleArchiveTag(tag)}
                                className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100"
                                disabled={isPending}
                              >
                                <ArchiveRestore className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="AI Tag Creation"
        description="Control how Salt creates and applies tags automatically."
      >
        <SettingsCard>
          <div className="space-y-6 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Auto-create confidence threshold</Label>
                <span className="text-sm text-muted-foreground">{threshold}%</span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                min={50}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Salt will only auto-create tags when confidence exceeds this threshold.
                Below it, tags are proposed for your approval.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Maximum AI-created tags per scope</Label>
                <span className="text-sm text-muted-foreground">{maxTags}</span>
              </div>
              <Slider
                value={[maxTags]}
                onValueChange={([v]) => setMaxTags(v)}
                min={10}
                max={100}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                Once this limit is reached, Salt will propose new tags instead of auto-creating them.
              </p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Taxonomies"
        description="These are the controlled vocabularies Salt uses to categorize your data."
      >
        <SettingsCard>
          <div className="divide-y">
            {Object.entries(VOCABULARY_REGISTRY).slice(0, 6).map(([key, vocab]) => (
              <div key={key} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{vocab.name}</p>
                  <p className="text-xs text-muted-foreground">{vocab.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {vocab.values.slice(0, 4).map((v) => (
                    <Badge key={v.slug} variant="secondary" className="text-xs">
                      {v.label}
                    </Badge>
                  ))}
                  {vocab.values.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{vocab.values.length - 4}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Create Tag Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="e.g., VIP, High Priority"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={newTagScope} onValueChange={(v) => setNewTagScope(v as TagScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="person">People only</SelectItem>
                    <SelectItem value="org">Organizations only</SelectItem>
                    <SelectItem value="work">Work only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTagCategory} onValueChange={(v) => setNewTagCategory(v as TagCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="segment">Segment</SelectItem>
                    <SelectItem value="signal">Signal</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={isPending || !newTagLabel.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTag} disabled={isPending || !newTagLabel.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Tags Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Merge "{selectedTag?.label}" into another tag. All assignments will be moved
              to the target tag, and "{selectedTag?.label}" will be archived.
            </p>
            <div className="space-y-2">
              <Label>Merge into</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target tag" />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargetOptions.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMergeTags} disabled={isPending || !mergeTargetId}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}
