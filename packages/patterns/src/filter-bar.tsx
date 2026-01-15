import { Search } from "lucide-react";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between",
        className
      )}
    >
      <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
        {onSearchChange && (
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto">{actions}</div>
      )}
    </div>
  );
}
