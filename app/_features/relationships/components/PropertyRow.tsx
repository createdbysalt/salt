"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@repo/utils";

interface PropertyRowProps {
  label: string;
  value: React.ReactNode | string | null | undefined;
  placeholder?: string;
  editable?: boolean;
  onSave?: (value: string) => Promise<void> | void;
  type?: "text" | "email" | "tel" | "url";
  icon?: React.ReactNode;
}

export function PropertyRow({
  label,
  value,
  placeholder = "Not set",
  editable = false,
  onSave,
  type = "text",
  icon,
}: PropertyRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Convert value to string for editing (only editable when value is string/null/undefined)
  const initialStringValue = typeof value === "string" ? value : "";
  const [editValue, setEditValue] = useState(initialStringValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Reset to original value on error
      setEditValue(typeof value === "string" ? value : "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(typeof value === "string" ? value : "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="group flex items-center gap-3 py-2 min-h-[36px]">
      {/* Icon - consistent size, muted color */}
      {icon && (
        <span className="text-muted-foreground/70 shrink-0">
          {icon}
        </span>
      )}

      {/* Label - fixed width for alignment */}
      <span className="text-[13px] text-muted-foreground min-w-[72px] shrink-0">
        {label}
      </span>

      {/* Value or Edit Input */}
      {isEditing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-[13px] flex-1"
            disabled={isSaving}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Handle both string and ReactNode values */}
          {typeof value === "string" || value === null || value === undefined ? (
            <span
              className={cn(
                "text-[13px] truncate flex-1",
                value ? "text-foreground" : "text-muted-foreground/50 italic"
              )}
            >
              {value || placeholder}
            </span>
          ) : (
            <span className="text-[13px] flex-1 text-foreground">
              {value}
            </span>
          )}
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
