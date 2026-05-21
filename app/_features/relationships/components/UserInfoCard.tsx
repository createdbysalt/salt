"use client";

import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import { MessageSquare, Phone, ExternalLink } from "lucide-react";

interface UserInfoCardProps {
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  tableUrl?: string | null;
  stats?: {
    label: string;
    value: string | number;
  }[];
  onSendMessage?: () => void;
}

/**
 * Get avatar background color using semantic design tokens.
 * Following Linear design: consistent muted monochrome avatars.
 */
function getAvatarColorClass(_name: string): string {
  // Linear-style: consistent muted gray for all avatars
  // This is more professional and avoids misleading color associations
  // (e.g., chart-4 is red/destructive which implies errors)
  return "salt-avatar-neutral";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserInfoCard({
  name,
  email,
  phone,
  tableUrl,
  stats,
  onSendMessage,
}: UserInfoCardProps) {
  const colorClass = getAvatarColorClass(name);
  const initials = getInitials(name);

  return (
    <div className="space-y-5">
      {/* Avatar and Name - Hero section with generous spacing */}
      <div className="flex flex-col items-center text-center pt-2">
        <Avatar className="h-14 w-14 mb-3">
          <AvatarFallback className={`${colorClass} text-base font-semibold`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-semibold text-base leading-tight">{name}</h2>
        {email && (
          <p className="text-[13px] text-muted-foreground mt-0.5">{email}</p>
        )}
      </div>

      {/* Contact Actions - Single primary action */}
      {onSendMessage && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onSendMessage}
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>
      )}

      {/* Stats Grid - Clean layout with subtle divider */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/50">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center py-1">
              <div className="text-base font-semibold tabular-nums">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Secondary Actions */}
      <div className="flex gap-2">
        {phone && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href={`tel:${phone}`}>
              <Phone className="h-4 w-4" />
              Call
            </a>
          </Button>
        )}
        {tableUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href={tableUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Bridge
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
