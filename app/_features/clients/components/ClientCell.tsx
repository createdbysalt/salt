"use client";

import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";

interface ClientCellProps {
  name: string;
  email: string | null;
  avatarColor?: string;
}

// Generate a consistent color based on the name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
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
        <AvatarFallback className={`${colorClass} text-white text-xs font-medium`}>
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
