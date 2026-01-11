"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { updateBridgeOverviewConfig } from "@/app/actions/clients/update-bridge-overview-config";
import type {
  BridgeOverviewConfig,
  WidgetConfig,
} from "@/types/bridge-overview";

interface BridgeConfigEditorProps {
  clientId: string;
  clientName: string;
  initialConfig: BridgeOverviewConfig;
}

// Sortable widget item component
function SortableWidget({
  widget,
  onToggle,
  onSettingsChange,
}: {
  widget: WidgetConfig;
  onToggle: (id: string) => void;
  onSettingsChange: (id: string, settings: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const widgetLabels: Record<string, string> = {
    "welcome-message": "Welcome Message",
    "project-status": "Project Status Cards",
    "needs-attention": "What Needs Your Attention",
    "recent-activity": "Recent Activity",
    "quick-actions": "Quick Actions",
    "knowledge-base-shortcuts": "Knowledge Base Shortcuts",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 bg-card mb-3"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`widget-${widget.id}`}
              checked={widget.visible}
              onCheckedChange={() => onToggle(widget.id)}
            />
            <Label htmlFor={`widget-${widget.id}`} className="font-medium">
              {widgetLabels[widget.id]}
            </Label>
          </div>

          {widget.visible && (
            <div className="ml-7 space-y-3">
              {/* Welcome Message settings */}
              {widget.id === "welcome-message" && (
                <div>
                  <Label>Custom Welcome Text</Label>
                  <Textarea
                    value={widget.settings?.welcomeText || ""}
                    onChange={(e) =>
                      onSettingsChange(widget.id, {
                        ...widget.settings,
                        welcomeText: e.target.value,
                      })
                    }
                    placeholder="Leave empty for default greeting"
                    rows={2}
                  />
                </div>
              )}

              {/* Project Status settings */}
              {widget.id === "project-status" && (
                <div>
                  <Label>View Style</Label>
                  <RadioGroup
                    value={widget.settings?.projectViewStyle || "grid"}
                    onValueChange={(value) =>
                      onSettingsChange(widget.id, {
                        ...widget.settings,
                        projectViewStyle: value,
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="grid" id="grid" />
                      <Label htmlFor="grid">Grid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="list" id="list" />
                      <Label htmlFor="list">List</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Recent Activity settings */}
              {widget.id === "recent-activity" && (
                <div>
                  <Label>Show activity from last</Label>
                  <Select
                    value={String(widget.settings?.activityDays || 7)}
                    onValueChange={(value) =>
                      onSettingsChange(widget.id, {
                        ...widget.settings,
                        activityDays: Number(value) as 3 | 7 | 14,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quick Actions settings - simplified for now */}
              {widget.id === "quick-actions" && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Quick action buttons are currently enabled by default
                  </Label>
                </div>
              )}

              {/* Knowledge Base Shortcuts - simplified for now */}
              {widget.id === "knowledge-base-shortcuts" && (
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Default links: Files and Resources
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BridgeConfigEditor({
  clientId,
  clientName,
  initialConfig,
}: BridgeConfigEditorProps) {
  const router = useRouter();
  const [config, setConfig] = useState<BridgeOverviewConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration issues with dnd-kit by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig((prevConfig) => {
        const oldIndex = prevConfig.widgets.findIndex(
          (w) => w.id === active.id
        );
        const newIndex = prevConfig.widgets.findIndex((w) => w.id === over.id);

        const newWidgets = arrayMove(prevConfig.widgets, oldIndex, newIndex);
        // Update order numbers
        const reorderedWidgets = newWidgets.map((w, index) => ({
          ...w,
          order: index,
        }));

        return {
          ...prevConfig,
          widgets: reorderedWidgets,
        };
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      widgets: prevConfig.widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      ),
    }));
  };

  const updateWidgetSettings = (widgetId: string, settings: any) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      widgets: prevConfig.widgets.map((w) =>
        w.id === widgetId ? { ...w, settings } : w
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateBridgeOverviewConfig(clientId, config);
      if (result.success) {
        toast.success("Bridge configuration saved successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(initialConfig);
    toast.success("Configuration reset to saved version");
  };

  const handlePreview = () => {
    window.open("/bridge", "_blank");
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-medium tracking-tight">
            Bridge Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Loading configuration for {clientName}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-medium tracking-tight">
          Bridge Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize the Overview dashboard for {clientName}
        </p>
      </div>

      {/* Layout Style */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Style</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.layoutStyle}
            onValueChange={(value: any) =>
              setConfig({ ...config, layoutStyle: value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="grid" id="layout-grid" />
              <Label htmlFor="layout-grid">
                Grid <span className="text-muted-foreground">(Recommended)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="list" id="layout-list" />
              <Label htmlFor="layout-list">
                List <span className="text-muted-foreground">(Simpler)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dashboard" id="layout-dashboard" />
              <Label htmlFor="layout-dashboard">
                Dashboard <span className="text-muted-foreground">(Data-rich)</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Widget Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Active Widgets</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag to reorder, toggle visibility, and configure settings
          </p>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={config.widgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {config.widgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  onToggle={toggleWidget}
                  onSettingsChange={updateWidgetSettings}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset
          </Button>
        </div>
        <Button variant="outline" onClick={handlePreview}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Bridge
        </Button>
      </div>
    </div>
  );
}
