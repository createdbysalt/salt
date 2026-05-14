"use client";

import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";

interface ClientCellProps {
  name: string;
  email: string | null;
  avatarColor?: string;
}

// Linear-style: Consistent muted monochrome
function getAvatarColor(_name: string): string {
  return "bg-muted";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClientCell({ name, email, avatarColor }: ClientCellProps) {
  const colorClass = avatarColor || getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className={`${colorClass} text-muted-foreground text-xs font-medium`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{name}</div>
        {email && (
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        )}
      </div>
    </div>
  );
}
