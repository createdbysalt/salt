"use client";

import { FileText, Plus, X, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";

interface ContextItem {
  id: string;
  label: string;
  type: "file" | "url" | "data";
  selected: boolean;
}

/**
 * ResearchContext - Files/data feeding current intelligence work
 * Inspired by Claude's working folder in Cowork mode
 */
export function ResearchContext() {
  // Mock data - will be replaced with actual context management
  const contextItems: ContextItem[] = [];

  const handleToggle = (id: string) => {
    // Will be implemented with actual state management
    console.log("Toggle context item:", id);
  };

  const handleRemove = (id: string) => {
    // Will be implemented with actual state management
    console.log("Remove context item:", id);
  };

  const handleAddContext = () => {
    // Will open context selection modal
    console.log("Add context");
  };

  const getTypeIcon = (type: ContextItem["type"]) => {
    switch (type) {
      case "url":
        return "🔗";
      case "data":
        return "📊";
      case "file":
      default:
        return "📄";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Research Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contextItems.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No context added</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Add files, URLs, or data to inform your research
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddContext}
              className="gap-2"
              disabled
            >
              <Plus className="h-3 w-3" />
              Add context
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {contextItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
              >
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => handleToggle(item.id)}
                />
                <span className="text-sm">{getTypeIcon(item.type)}</span>
                <span className="flex-1 text-sm truncate">{item.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={handleAddContext}
              disabled
            >
              <Plus className="h-3 w-3 mr-2" />
              Add context
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
