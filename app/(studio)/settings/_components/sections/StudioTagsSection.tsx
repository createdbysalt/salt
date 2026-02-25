"use client"

import { Tag } from "lucide-react"
import { SettingsPage } from "../SettingsPage"

export function StudioTagsSection() {
  return (
    <SettingsPage title="Tags">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Tag className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Project types and tags are coming soon. You&apos;ll be able to
            categorize your projects and clients with custom labels.
          </p>
        </div>
      </div>
    </SettingsPage>
  )
}
