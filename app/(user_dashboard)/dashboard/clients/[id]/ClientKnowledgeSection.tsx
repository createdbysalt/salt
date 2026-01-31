"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/_components/ui/card";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  FileText,
  Link as LinkIcon,
  StickyNote,
  FileQuestion,
  MessageSquare,
} from "lucide-react";
import { KnowledgeItemCard } from "./KnowledgeItemCard";
import { AddKnowledgeModal } from "./AddKnowledgeModal";
import type { KnowledgeItem } from "./knowledge-actions";

interface ClientKnowledgeSectionProps {
  clientId: string;
  knowledgeItems: KnowledgeItem[];
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  transcript: <MessageSquare className="h-4 w-4" />,
  intake_response: <FileQuestion className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  document: "Documents",
  transcript: "Transcripts",
  intake_response: "Intake Responses",
  note: "Notes",
  link: "Links",
};

export function ClientKnowledgeSection({
  clientId,
  knowledgeItems,
}: ClientKnowledgeSectionProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<"note" | "link" | "document">("note");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Separate pinned and unpinned items
  const pinnedItems = knowledgeItems.filter((item) => item.isPinned);
  const unpinnedItems = knowledgeItems.filter((item) => !item.isPinned);

  // Group unpinned items by type
  const itemsByType = unpinnedItems.reduce((acc, item) => {
    if (!acc[item.contentType]) {
      acc[item.contentType] = [];
    }
    acc[item.contentType].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItem[]>);

  const handleAddNote = () => {
    setAddModalType("note");
    setShowAddModal(true);
  };

  const handleAddLink = () => {
    setAddModalType("link");
    setShowAddModal(true);
  };

  const handleAddDocument = () => {
    setAddModalType("document");
    setShowAddModal(true);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
    router.refresh();
  };

  const handleError = (message: string) => {
    setError(message);
    setSuccess(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Store documents, notes, and links related to this client
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddNote}>
                <StickyNote className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddLink}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Add Link
              </Button>
              <Button size="sm" onClick={handleAddDocument}>
                <Plus className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert
              variant="default"
              className="bg-success/10 text-success border-success"
            >
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {knowledgeItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No items yet</p>
              <p className="text-sm mt-1">
                Add notes, links, or upload files to build this client&apos;s knowledge
                base
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleAddNote}>
                  Add a Note
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddLink}>
                  Add a Link
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Pinned Items */}
              {pinnedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Pinned
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pinnedItems.map((item) => (
                      <KnowledgeItemCard
                        key={item.id}
                        item={item}
                        onSuccess={handleSuccess}
                        onError={handleError}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Items by Type */}
              {Object.entries(itemsByType).map(([type, items]) => (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    {CONTENT_TYPE_ICONS[type]}
                    {CONTENT_TYPE_LABELS[type] || type}
                    <span className="text-xs font-normal">({items.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <KnowledgeItemCard
                        key={item.id}
                        item={item}
                        onSuccess={handleSuccess}
                        onError={handleError}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <AddKnowledgeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        clientId={clientId}
        initialType={addModalType}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </>
  );
}
