"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Button } from "@/app/_components/ui/button";
import { X } from "lucide-react";
import type { InboxItemType } from "../types";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface InboxFiltersProps {
  clients: Client[];
  projects: Project[];
}

const TYPE_OPTIONS: { value: InboxItemType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "message", label: "Messages" },
  { value: "meeting", label: "Meetings" },
  { value: "invoice", label: "Invoices" },
  { value: "milestone", label: "Milestones" },
  { value: "proposal", label: "Proposals" },
  { value: "alert", label: "Alerts" },
];

/**
 * InboxFilters - Hybrid filter approach (Linear + Superhuman pattern)
 *
 * Three dropdown filters:
 * - Client: Filter by specific client
 * - Project: Filter by specific project
 * - Type: Filter by item type (messages, meetings, etc.)
 */
export function InboxFilters({ clients, projects }: InboxFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentClient = searchParams.get("client") || "all";
  const currentProject = searchParams.get("project") || "all";
  const currentType = searchParams.get("type") || "all";

  const hasFilters =
    currentClient !== "all" ||
    currentProject !== "all" ||
    currentType !== "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/studio?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/studio");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Client Filter */}
      <Select value={currentClient} onValueChange={(v) => updateFilter("client", v)}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project Filter */}
      <Select value={currentProject} onValueChange={(v) => updateFilter("project", v)}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select value={currentType} onValueChange={(v) => updateFilter("type", v)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
