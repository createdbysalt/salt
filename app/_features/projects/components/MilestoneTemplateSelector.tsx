"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/app/_components/ui/radio-group";
import { Label } from "@/app/_components/ui/label";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@repo/utils";
import {
  getTemplateOptions,
  type MilestoneTemplateKey,
} from "@/app/_lib/milestone-templates";
import {
  Globe,
  Palette,
  FileText,
  Layers,
  FileQuestion,
} from "lucide-react";

interface MilestoneTemplateSelectorProps {
  value: MilestoneTemplateKey | "blank";
  onChange: (value: MilestoneTemplateKey | "blank") => void;
}

const templateIcons: Record<string, React.ReactNode> = {
  website: <Globe className="h-5 w-5" />,
  brand: <Palette className="h-5 w-5" />,
  content: <FileText className="h-5 w-5" />,
  simple: <Layers className="h-5 w-5" />,
  blank: <FileQuestion className="h-5 w-5" />,
};

export function MilestoneTemplateSelector({
  value,
  onChange,
}: MilestoneTemplateSelectorProps) {
  const templates = getTemplateOptions();

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as MilestoneTemplateKey | "blank")}
      className="space-y-3"
    >
      {templates.map((template) => (
        <label
          key={template.key}
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
            value === template.key
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
          )}
        >
          <RadioGroupItem value={template.key} className="mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {templateIcons[template.key]}
              </span>
              <span className="font-medium">{template.name}</span>
              <Badge variant="secondary" className="text-xs">
                {template.milestones.length} milestones
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {template.milestones.map((m, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {m.title}
                  {i < template.milestones.length - 1 && (
                    <span className="mx-1">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </label>
      ))}

      {/* Blank option */}
      <label
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
          value === "blank"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
      >
        <RadioGroupItem value="blank" className="mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{templateIcons.blank}</span>
            <span className="font-medium">Blank</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Start with no milestones and add your own later
          </p>
        </div>
      </label>
    </RadioGroup>
  );
}

/**
 * Compact version for inline use (buttons instead of radio list)
 */
interface MilestoneTemplateButtonsProps {
  onSelect: (templateKey: MilestoneTemplateKey) => void;
  disabled?: boolean;
}

export function MilestoneTemplateButtons({
  onSelect,
  disabled = false,
}: MilestoneTemplateButtonsProps) {
  const templates = getTemplateOptions();

  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((template) => (
        <button
          key={template.key}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(template.key as MilestoneTemplateKey)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
            "hover:border-primary hover:bg-primary/5 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <span className="text-muted-foreground">
            {templateIcons[template.key]}
          </span>
          <span className="font-medium text-sm">{template.name}</span>
          <span className="text-xs text-muted-foreground">
            {template.milestones.length} phases
          </span>
        </button>
      ))}
    </div>
  );
}
