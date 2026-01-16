"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@repo/utils";

interface MessageSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function MessageSearchInput({
  value,
  onChange,
  onSearch,
  isSearching = false,
  placeholder = "Search messages...",
  className,
  debounceMs = 300,
}: MessageSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle input change with debouncing
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new debounce for search
      if (newValue.trim()) {
        debounceRef.current = setTimeout(() => {
          onSearch(newValue.trim());
        }, debounceMs);
      }
    },
    [onChange, onSearch, debounceMs]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [onChange]);

  // Handle Enter key for immediate search
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && localValue.trim()) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSearch(localValue.trim());
      }
    },
    [localValue, onSearch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9"
      />
      {isSearching ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : localValue ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      ) : null}
    </div>
  );
}
