"use client"

import * as React from "react"
import { Pencil, X, Loader2 } from "lucide-react"
import { cn } from "@repo/utils"

export interface Tag {
  id: string
  name: string
  is_default?: boolean
}

interface TagManagerProps {
  tags: Tag[]
  isLoading?: boolean
  onAdd: (name: string) => Promise<{ success: boolean; error?: string }>
  onUpdate: (id: string, name: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>
  placeholder?: string
  emptyMessage?: string
  className?: string
}

export function TagManager({
  tags,
  isLoading = false,
  onAdd,
  onUpdate,
  onDelete,
  placeholder = "Type and press Enter...",
  className,
}: TagManagerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const editInputRef = React.useRef<HTMLInputElement>(null)

  // Focus edit input when editing starts
  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Handle creating new tag
  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      setIsSaving(true)
      const result = await onAdd(inputValue.trim())
      setIsSaving(false)
      if (result.success) {
        setInputValue("")
      }
    }
  }

  // Start editing a tag
  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditValue(tag.name)
  }

  // Save edit
  async function saveEdit() {
    if (!editingId || !editValue.trim()) {
      setEditingId(null)
      setEditValue("")
      return
    }

    const tag = tags.find((t) => t.id === editingId)
    if (tag && editValue.trim() === tag.name) {
      setEditingId(null)
      setEditValue("")
      return
    }

    setIsSaving(true)
    const result = await onUpdate(editingId, editValue.trim())
    setIsSaving(false)

    if (result.success) {
      setEditingId(null)
      setEditValue("")
    }
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

  // Handle delete
  async function handleDelete(id: string) {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          className
        )}
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tags...</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Tag chips */}
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-sm"
        >
          {editingId === tag.id ? (
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
              disabled={isSaving}
            />
          ) : (
            // Display mode
            <>
              <span>{tag.name}</span>
              <span className="flex items-center gap-0.5 ml-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(tag)
                  }}
                  className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                  disabled={isSaving}
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(tag.id)
                  }}
                  className="rounded-sm opacity-50 hover:opacity-100 transition-opacity"
                  disabled={deletingId === tag.id}
                >
                  {deletingId === tag.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <X className="size-3" />
                  )}
                </button>
              </span>
            </>
          )}
        </span>
      ))}

      {/* Input for creating new tags */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] bg-transparent outline-none placeholder:text-muted-foreground"
        disabled={isSaving}
      />
      {isSaving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  )
}
