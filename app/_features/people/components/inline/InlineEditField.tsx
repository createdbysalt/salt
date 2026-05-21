"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@repo/utils";

export interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  displayClassName?: string;
}

export function InlineEditField({
  value,
  onSave,
  placeholder = "Click to edit",
  className,
  inputClassName,
  multiline = false,
  displayClassName,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = async () => {
    if (isSaving) return;

    if (localValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(localValue);
      setIsEditing(false);
    } catch {
      setLocalValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <div className={cn("relative", multiline ? "w-full" : "inline-block w-full", className)}>
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => void handleSave()}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={cn(
            "rounded border-none bg-muted/50 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
            multiline ? "min-h-[80px] w-full resize-none text-left" : "w-full text-left",
            inputClassName
          )}
          rows={multiline ? 3 : undefined}
        />
        {isSaving ? (
          <Loader2 className="absolute right-2 top-2 size-3 animate-spin text-muted-foreground" />
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "-mx-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/40",
        multiline ? "block w-full" : "inline-block w-full",
        !value && "text-muted-foreground",
        displayClassName
      )}
    >
      {value || placeholder}
    </button>
  );
}
