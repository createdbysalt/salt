"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@repo/utils";

interface PropertyRowProps {
  label: string;
  value: string | null | undefined;
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
  const [editValue, setEditValue] = useState(value || "");
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
      setEditValue(value || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
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
    <div className="group flex items-center justify-between py-1.5 min-h-[32px]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span>{label}</span>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 ml-2">
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            disabled={isSaving}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 ml-2 justify-end">
          <span
            className={cn(
              "text-sm truncate",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {value || placeholder}
          </span>
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
