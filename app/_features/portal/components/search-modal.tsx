"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderKanban, X } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Badge } from "@/app/_components/ui/badge";
import { searchBridgeContent } from "./search-action";

interface SearchResult {
  id: string;
  type: "project" | "request" | "file";
  title: string;
  description?: string;
  url: string;
  metadata?: any;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchBridgeContent(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    onOpenChange(false);
    setQuery("");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderKanban className="h-4 w-4" />;
      case "request":
        return <FileText className="h-4 w-4" />;
      case "file":
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "project":
        return "Project";
      case "request":
        return "Request";
      case "file":
        return "File";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, requests, and files..."
              className="pl-9 pr-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto px-2 pb-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {query ? "No results found" : "Type to search..."}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
                >
                  <div className="rounded bg-primary/10 p-2 text-primary">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

