"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  FolderKanban,
  Users,
  MessageSquare,
  FileText,
  Search,
  Trash2,
  Star,
  MoreHorizontal,
  ExternalLink,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Input } from "@/app/_components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { PageBanner } from "@repo/patterns";
import { useRecents } from "../hooks/useRecents";
import { useFavorites } from "../hooks/useFavorites";
import type { RecentItemType } from "../types/recents";
import type { FavoriteItemType } from "../types/favorites";

// Map item types to icons
const ITEM_TYPE_ICONS: Record<RecentItemType, typeof FolderKanban> = {
  project: FolderKanban,
  client: Users,
  conversation: MessageSquare,
  org: Users,
  file: FileText,
  meeting: MessageSquare,
  play: Search,
};

// Map item types to labels
const ITEM_TYPE_LABELS: Record<RecentItemType, string> = {
  project: "Project",
  client: "Client",
  conversation: "Conversation",
  org: "Org",
  file: "File",
  meeting: "Meeting",
  play: "Play",
};

const AVAILABLE_TYPES: RecentItemType[] = [
  "project",
  "client",
  "conversation",
  "org",
  "file",
  "meeting",
  "play",
];

// Types that can be favorited (subset of RecentItemType)
const FAVORITABLE_TYPES: FavoriteItemType[] = [
  "project",
  "client",
  "org",
  "file",
  "meeting",
  "play",
];

// Check if a type can be favorited
const isFavoritableType = (type: RecentItemType): type is FavoriteItemType => {
  return FAVORITABLE_TYPES.includes(type as FavoriteItemType);
};

const PAGE_CONFIG = {
  title: "Recents",
  description: "Recently visited people, orgs, work, files, meetings, and plays",
  emptyTitle: "No recent items",
  emptyDescription: "Visit a page in Salt to see it here.",
};

export function RecentsPageClient() {
  const { recents, isLoading, removeRecent, clearRecents } = useRecents({
    limit: 50,
  });
  const { favorites, toggleFavorite } = useFavorites();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilters, setTypeFilters] = useState<RecentItemType[]>([]);

  // Create a set of favorited IDs for quick lookup
  const favoritedIds = new Set(favorites.map((f) => f.id));

  const availableTypes = AVAILABLE_TYPES;
  const config = PAGE_CONFIG;

  // Filter recents
  const filteredRecents = useMemo(() => {
    return recents.filter((item) => {
      // Type filter
      if (typeFilters.length > 0 && !typeFilters.includes(item.type)) {
        return false;
      }
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(search);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(search);
        if (!matchesLabel && !matchesSubtitle) {
          return false;
        }
      }
      return true;
    });
  }, [recents, typeFilters, searchTerm]);

  // Toggle a type filter
  const toggleTypeFilter = (type: RecentItemType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const hasActiveFilters = typeFilters.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="border rounded-lg overflow-hidden">
          <div className="h-12 bg-muted/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-t bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <PageBanner
        title={config.title}
        subtitle={config.description}
        noBorder
      />

      {/* Toolbar: Filters + Search/Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Filters (left side) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filters:</span>

          {/* Type filter dropdown - only show if multiple types */}
          {availableTypes.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  Type: {typeFilters.length === 0 ? "All" : typeFilters.length === 1 ? ITEM_TYPE_LABELS[typeFilters[0]] : `${typeFilters.length} selected`}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[160px]">
                <DropdownMenuItem onClick={() => setTypeFilters([])}>
                  All types
                  {typeFilters.length === 0 && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableTypes.map((type) => {
                  const Icon = ITEM_TYPE_ICONS[type];
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className="gap-2"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {ITEM_TYPE_LABELS[type]}s
                      {typeFilters.includes(type) && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Active filter badges */}
          {typeFilters.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="h-7 gap-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleTypeFilter(type)}
            >
              {ITEM_TYPE_LABELS[type]}s
              <X className="h-3 w-3" />
            </Badge>
          ))}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilters([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Search and Actions (right side) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          {recents.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecents}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredRecents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="font-medium">
            {hasActiveFilters || searchTerm ? "No matching items" : config.emptyTitle}
          </p>
          <p className="text-sm mt-1">
            {hasActiveFilters || searchTerm
              ? "Try adjusting your filters or search term."
              : config.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[320px]">Name</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[160px]">Last Visited</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecents.map((item) => {
                const Icon = ITEM_TYPE_ICONS[item.type] || FolderKanban;
                const isFavorited = favoritedIds.has(item.id);

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {/* Name */}
                    <TableCell>
                      <Link href={item.href} className="flex items-center gap-3">
                        <div className="shrink-0 rounded-md bg-muted p-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.label}</p>
                          {item.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {isFavorited && (
                          <Star className="h-3.5 w-3.5 text-foreground/70 fill-foreground/70 shrink-0" />
                        )}
                      </Link>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Link href={item.href} className="block">
                        <span className="text-sm text-muted-foreground">
                          {ITEM_TYPE_LABELS[item.type]}
                        </span>
                      </Link>
                    </TableCell>

                    {/* Last Visited */}
                    <TableCell>
                      <Link href={item.href} className="block text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.lastVisited), { addSuffix: true })}
                      </Link>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuItem asChild>
                            <Link href={item.href}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </Link>
                          </DropdownMenuItem>
                          {isFavoritableType(item.type) && (
                            <DropdownMenuItem
                              onClick={() =>
                                toggleFavorite({
                                  id: item.id,
                                  type: item.type as FavoriteItemType,
                                  label: item.label,
                                  href: item.href,
                                })
                              }
                            >
                              <Star className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                              {isFavorited ? "Unfavorite" : "Favorite"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeRecent(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
