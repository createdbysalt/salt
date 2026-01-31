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
import { Spinner } from "@/app/_components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Upload, StickyNote, Link as LinkIcon, FileText } from "lucide-react";
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

export function AddKnowledgeModal({
  isOpen,
  onClose,
  clientId,
  initialType,
  onSuccess,
  onError,
}: AddKnowledgeModalProps) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // Link form state
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Document form state
  const [docTitle, setDocTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setLinkTitle("");
    setLinkUrl("");
    setDocTitle("");
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
      tags: [],
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
      tags: [],
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [docTitle]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Knowledge Base</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="note" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              File
            </TabsTrigger>
          </TabsList>

          {/* Note Tab */}
          <TabsContent value="note" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your note..."
                rows={6}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitNote} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Adding...
                  </>
                ) : (
                  "Add Note"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title..."
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitLink} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Adding...
                  </>
                ) : (
                  "Add Link"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Document Tab */}
          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title (optional)</Label>
              <Input
                id="doc-title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Uses filename if left empty..."
                disabled={isSubmitting}
              />
            </div>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-10 w-10 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max file size: 50MB
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
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={isSubmitting}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDocument}
                disabled={isSubmitting || !selectedFile}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Uploading...
                  </>
                ) : (
                  "Upload File"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
