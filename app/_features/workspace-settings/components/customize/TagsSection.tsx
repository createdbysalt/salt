"use client";

import * as React from "react";
import { Tags, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
} from "@repo/ui";
import { useWorkspaceProjectTypes } from "../../hooks/useWorkspaceProjectTypes";
import { createProjectType, deleteProjectType } from "../../actions";

interface StudioProjectType {
  id: string;
  name: string;
}

export function TagsSection() {
  const { projectTypes, isLoading, mutate } = useWorkspaceProjectTypes();
  const [newTypeName, setNewTypeName] = React.useState("");
  const [isCreating, startCreateTransition] = React.useTransition();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleCreate = () => {
    if (!newTypeName.trim()) return;

    startCreateTransition(async () => {
      const result = await createProjectType({ name: newTypeName.trim() });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Project type added");
      setNewTypeName("");
      mutate();
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteProjectType(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Project type removed");
      mutate();
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="size-5" />
            Project Types
          </CardTitle>
          <CardDescription>
            Categorize your projects for better organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Add project type..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              variant="outline"
              onClick={handleCreate}
              disabled={isCreating || !newTypeName.trim()}
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </div>

          {!projectTypes?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Tags className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No project types defined yet
              </p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {projectTypes.map((type: StudioProjectType) => (
                <Badge
                  key={type.id}
                  variant="secondary"
                  className="gap-1 pl-3 pr-1 py-1"
                >
                  {type.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 hover:bg-transparent"
                    onClick={() => handleDelete(type.id)}
                    disabled={deletingId === type.id}
                  >
                    {deletingId === type.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future: Client Tags, Task Labels, etc. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground">Coming Soon</CardTitle>
          <CardDescription>
            Client tags, task labels, and custom fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            More customization options are on the way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
