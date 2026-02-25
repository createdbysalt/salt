"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Label } from "@/app/_components/ui/label";
import { Badge } from "@/app/_components/ui/badge";
import {
  Upload,
  StickyNote,
  Link as LinkIcon,
  FileText,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  createKnowledgeItem,
  getKnowledgeUploadUrl,
} from "./knowledge-actions";

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  initialType: "note" | "link" | "document";
  onSuccess: (_message: string) => void;
  onError: (_message: string) => void;
}

type TabType = "note" | "link" | "document";

const TAB_CONFIG: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "note", label: "Note", icon: <StickyNote className="h-3.5 w-3.5" /> },
  { id: "link", label: "Link", icon: <LinkIcon className="h-3.5 w-3.5" /> },
  { id: "document", label: "File", icon: <FileText className="h-3.5 w-3.5" /> },
];

export function AddKnowledgeModal({
  isOpen,
  onClose,
  clientId,
  initialType,
  onSuccess,
  onError,
}: AddKnowledgeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Note form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteTagInput, setNoteTagInput] = useState("");

  // Link form state
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTags, setLinkTags] = useState<string[]>([]);
  const [linkTagInput, setLinkTagInput] = useState("");

  // Document form state
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docTags, setDocTags] = useState<string[]>([]);
  const [docTagInput, setDocTagInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setNoteTags([]);
    setNoteTagInput("");
    setLinkTitle("");
    setLinkUrl("");
    setLinkTags([]);
    setLinkTagInput("");
    setDocTitle("");
    setDocDescription("");
    setDocTags([]);
    setDocTagInput("");
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Tag management helpers
  const addTag = (
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setInput("");
    }
  };

  const removeTag = (
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>,
    tagToRemove: string
  ) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (
    e: React.KeyboardEvent,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tags, setTags, input, setInput);
    }
  };

  // AI description generation
  const generateDescription = async () => {
    if (!selectedFile) return;

    setIsGeneratingDescription(true);

    // TODO: Call intelligence API to generate description from file
    // For now, simulate with a delay and basic description
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    const fileType =
      extension === "pdf"
        ? "PDF document"
        : extension === "docx" || extension === "doc"
          ? "Word document"
          : extension === "xlsx" || extension === "xls"
            ? "spreadsheet"
            : extension === "png" || extension === "jpg" || extension === "jpeg"
              ? "image"
              : "file";

    setDocDescription(
      `${fileType} uploaded on ${new Date().toLocaleDateString()}. Contains ${selectedFile.name.replace(/\.[^/.]+$/, "")} content.`
    );
    setIsGeneratingDescription(false);
  };

  const handleSubmitNote = async () => {
    if (!noteTitle.trim()) {
      onError("Title is required");
      return;
    }

    setIsSubmitting(true);
    const result = await createKnowledgeItem({
      clientId,
      title: noteTitle.trim(),
      contentType: "note",
      content: noteContent.trim(),
      tags: noteTags,
    });
    setIsSubmitting(false);

    if (result.success) {
      onSuccess("Note added");
      handleClose();
    } else {
      onError(result.error || "Failed to add note");
    }
  };

  const handleSubmitLink = async () => {
    if (!linkTitle.trim()) {
      onError("Title is required");
      return;
    }
    if (!linkUrl.trim()) {
      onError("URL is required");
      return;
    }

    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      onError("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);
    const result = await createKnowledgeItem({
      clientId,
      title: linkTitle.trim(),
      contentType: "link",
      externalUrl: linkUrl.trim(),
      tags: linkTags,
    });
    setIsSubmitting(false);

    if (result.success) {
      onSuccess("Link added");
      handleClose();
    } else {
      onError(result.error || "Failed to add link");
    }
  };

  const handleSubmitDocument = async () => {
    if (!selectedFile) {
      onError("Please select a file");
      return;
    }

    const title = docTitle.trim() || selectedFile.name;

    setIsSubmitting(true);

    // Get upload URL
    const urlResult = await getKnowledgeUploadUrl({
      clientId,
      title,
      fileName: selectedFile.name,
      mimeType: selectedFile.type,
      sizeBytes: selectedFile.size,
      contentType: "document",
    });

    if (!urlResult.success || !urlResult.data) {
      setIsSubmitting(false);
      onError(urlResult.error || "Failed to get upload URL");
      return;
    }

    // Upload file
    try {
      const response = await fetch(urlResult.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setIsSubmitting(false);
      onSuccess("Document uploaded");
      handleClose();
    } catch {
      setIsSubmitting(false);
      onError("Failed to upload file");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        if (!docTitle) {
          setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    [docTitle]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Tag input component
  const TagInput = ({
    tags,
    setTags,
    tagInput,
    setTagInput,
    disabled,
  }: {
    tags: string[];
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    tagInput: string;
    setTagInput: React.Dispatch<React.SetStateAction<string>>;
    disabled: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Tags (optional, max 5)
      </Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs px-2 py-0.5 gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tags, setTags, tag)}
              className="ml-0.5 hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {tags.length < 5 && (
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) =>
            handleTagKeyDown(e, tags, setTags, tagInput, setTagInput)
          }
          onBlur={() => addTag(tags, setTags, tagInput, setTagInput)}
          placeholder="Type and press Enter..."
          className="h-8 text-xs"
          disabled={disabled}
        />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Add to Knowledge Base
          </DialogTitle>
        </DialogHeader>

        {/* Pill-style tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Note Form */}
        {activeTab === "note" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="note-title" className="text-xs">
                Title
              </Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="h-9"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content" className="text-xs">
                Content
              </Label>
              <Textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your note..."
                rows={4}
                className="text-sm resize-none"
                disabled={isSubmitting}
              />
            </div>
            <TagInput
              tags={noteTags}
              setTags={setNoteTags}
              tagInput={noteTagInput}
              setTagInput={setNoteTagInput}
              disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitNote} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Note"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Link Form */}
        {activeTab === "link" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-title" className="text-xs">
                Title
              </Label>
              <Input
                id="link-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title..."
                className="h-9"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs">
                URL
              </Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-9"
                disabled={isSubmitting}
              />
            </div>
            <TagInput
              tags={linkTags}
              setTags={setLinkTags}
              tagInput={linkTagInput}
              setTagInput={setLinkTagInput}
              disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitLink} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Link"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Document Form */}
        {activeTab === "document" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title" className="text-xs">
                Title (optional)
              </Label>
              <Input
                id="doc-title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Uses filename if empty..."
                className="h-9"
                disabled={isSubmitting}
              />
            </div>

            {/* Drop zone */}
            <div
              className={`border border-dashed rounded-lg p-6 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setDocDescription("");
                    }}
                    className="text-xs"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to select
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Max 50MB
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileSelect}
                    disabled={isSubmitting}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {/* AI Description */}
            {selectedFile && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="doc-description" className="text-xs">
                    Description
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateDescription}
                    disabled={isGeneratingDescription || isSubmitting}
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Auto-generate
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="doc-description"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Add a description or click auto-generate..."
                  rows={2}
                  className="text-sm resize-none"
                  disabled={isSubmitting || isGeneratingDescription}
                />
              </div>
            )}

            <TagInput
              tags={docTags}
              setTags={setDocTags}
              tagInput={docTagInput}
              setTagInput={setDocTagInput}
              disabled={isSubmitting}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitDocument}
                disabled={isSubmitting || !selectedFile}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload File"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
