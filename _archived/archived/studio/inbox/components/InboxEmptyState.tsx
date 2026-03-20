"use client";

import Link from "next/link";
import { Sparkles, Users, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/app/_components/ui/card";
import { studioRoutes } from "@/app/_features/shell/routes";

interface InboxEmptyStateProps {
  /** Number of clients the user has */
  clientCount: number;
  /** Number of projects the user has */
  projectCount: number;
  /** Whether user has any filters active */
  hasFilters?: boolean;
}

/**
 * InboxEmptyState - Celebratory empty state
 *
 * Two variants:
 * 1. First-time user (no clients/projects) - CTA to add first client
 * 2. All clear (has data but nothing needs attention) - Celebration + stats
 */
export function InboxEmptyState({
  clientCount,
  projectCount,
  hasFilters = false,
}: InboxEmptyStateProps) {
  const hasData = clientCount > 0 || projectCount > 0;

  // Filtered empty state
  if (hasFilters) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">
              No items match your filters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // All clear state (has data but nothing needs attention)
  if (hasData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">All clear!</h2>
            <p className="text-muted-foreground mb-6">
              No items need your attention right now.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <Link
                href={studioRoutes.clients.list}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">{clientCount}</p>
                  <p className="text-xs text-muted-foreground">Clients</p>
                </div>
              </Link>
              <Link
                href={studioRoutes.projects.list}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">{projectCount}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // First-time user empty state
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="rounded-full bg-primary/10 p-4 mb-6">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Welcome to your inbox</h2>
          <p className="text-muted-foreground mb-8">
            Start by adding a client or creating a project. Items needing your
            attention will appear here.
          </p>
          <div className="flex gap-3">
            <Link
              href={studioRoutes.clients.new}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Client
            </Link>
            <Link
              href={studioRoutes.projects.new}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              Create Project
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
