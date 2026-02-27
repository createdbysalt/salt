"use client"

import * as React from "react"
import { X, Pencil, Check } from "lucide-react"
import { cn } from "@repo/utils"

// Types
export interface ComboboxItem {
  value: string
  label: string
  group?: string
}

export interface ComboboxProps {
  /** Items to display as chips */
  items: ComboboxItem[]
  /** Currently selected values */
  value?: string[]
  /** Called when a value is removed */
  onRemove?: (value: string) => void
  /** Called when a new item should be created */
  onCreate?: (name: string) => void
  /** Called when an item is edited */
  onEdit?: (value: string, newName: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function MultiSelectCombobox({
  items,
  value = [],
  onRemove,
  onCreate,
  onEdit,
  placeholder = "Type and press Enter...",
  className,
  disabled = false,
}: ComboboxProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const editInputRef = React.useRef<HTMLInputElement>(null)

  // Get label for a value
  const getLabel = (val: string) => items.find((item) => item.value === val)?.label || val

  // Handle creating new item
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      onCreate?.(inputValue.trim())
      setInputValue("")
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last item on backspace when input is empty
      onRemove?.(value[value.length - 1])
    }
  }

  // Start editing a chip
  function startEdit(val: string) {
    setEditingId(val)
    setEditValue(getLabel(val))
    // Focus the edit input after render
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  // Save edit
  function saveEdit() {
    if (editingId && editValue.trim() && editValue !== getLabel(editingId)) {
      onEdit?.(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue("")
  }

  // Handle edit keydown
  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === "Escape") {
      setEditingId(null)
      setEditValue("")
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {/* Chips */}
      {value.map((val) => (
        <span
          key={val}
          className="flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-sm"
        >
          {editingId === val ? (
            // Editing mode
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={saveEdit}
              className="bg-transparent outline-none w-auto min-w-[60px]"
              style={{ width: `${Math.max(editValue.length, 6)}ch` }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // Display mode
            <>
              <span>{getLabel(val)}</span>
              <span className="flex items-center gap-0.5 ml-0.5">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(val)
                    }}
                    className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                    disabled={disabled}
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(val)
                    }}
                    className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                    disabled={disabled}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            </>
          )}
        </span>
      ))}

      {/* Input for creating new items */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] bg-transparent outline-none placeholder:text-muted-foreground"
        disabled={disabled}
      />
    </div>
  )
}

export { MultiSelectCombobox }
