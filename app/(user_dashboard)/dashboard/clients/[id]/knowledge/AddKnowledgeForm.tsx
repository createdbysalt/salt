"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Switch } from "@/app/_components/ui/switch";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { X, Plus, Loader2 } from "lucide-react";
import {
  KNOWLEDGE_TYPE_CONFIG,
  type KnowledgeType,
  type KnowledgeItemWithRelations,
} from "@/app/_features/knowledge/types";

interface AddKnowledgeFormProps {
  initialData?: KnowledgeItemWithRelations;
  onSubmit: (data: {
    type: KnowledgeType;
    title: string;
    content?: string;
    source_url?: string;
    tags?: string[];
    is_pinned?: boolean;
    is_private?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddKnowledgeForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddKnowledgeFormProps) {
  const [type, setType] = useState<KnowledgeType>(initialData?.type ?? "document");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned ?? false);
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!initialData;

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (type === "link" && !sourceUrl.trim()) {
      newErrors.sourceUrl = "URL is required for link type";
    }

    if (sourceUrl && !isValidUrl(sourceUrl)) {
      newErrors.sourceUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit({
      type,
      title: title.trim(),
      content: content.trim() || undefined,
      source_url: sourceUrl.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      is_pinned: isPinned,
      is_private: isPrivate,
    });
  };

  // Determine which types require content vs URL
  const typeNeedsUrl = type === "link";
  const typeNeedsContent = ["document", "discovery_note", "meeting_transcript", "insight", "decision", "feedback"].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selection (disabled when editing) */}
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as KnowledgeType)}
          disabled={isEditing}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KNOWLEDGE_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title..."
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Source URL (for links and assets) */}
      {(typeNeedsUrl || sourceUrl) && (
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">
            {type === "link" ? "URL" : "Source URL (optional)"}
          </Label>
          <Input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className={errors.sourceUrl ? "border-destructive" : ""}
          />
          {errors.sourceUrl && (
            <p className="text-xs text-destructive">{errors.sourceUrl}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">
          {typeNeedsContent ? "Content" : "Notes (optional)"}
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "link"
              ? "Add any notes about this link..."
              : "Enter content..."
          }
          rows={6}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="pinned">Pin this item</Label>
            <p className="text-xs text-muted-foreground">
              Pinned items appear at the top of the list
            </p>
          </div>
          <Switch
            id="pinned"
            checked={isPinned}
            onCheckedChange={setIsPinned}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="private">Make private</Label>
            <p className="text-xs text-muted-foreground">
              Private items are hidden from the client portal
            </p>
          </div>
          <Switch
            id="private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}
