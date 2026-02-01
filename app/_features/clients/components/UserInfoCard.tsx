"use client";

import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import { Mail, Phone, ExternalLink } from "lucide-react";

interface UserInfoCardProps {
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  portalUrl?: string | null;
  stats?: {
    label: string;
    value: string | number;
  }[];
  onSendMessage?: () => void;
}

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

export function UserInfoCard({
  name,
  email,
  phone,
  avatarUrl,
  portalUrl,
  stats,
  onSendMessage,
}: UserInfoCardProps) {
  const colorClass = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div className="space-y-4">
      {/* Avatar and Name */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-16 w-16 mb-3">
          <AvatarFallback className={`${colorClass} text-white text-lg font-medium`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-semibold text-lg">{name}</h2>
        {email && (
          <p className="text-sm text-muted-foreground">{email}</p>
        )}
      </div>

      {/* Contact Actions */}
      <div className="flex gap-2">
        {email && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onSendMessage}
          >
            <Mail className="h-4 w-4 mr-2" />
            Message
          </Button>
        )}
        {phone && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={`tel:${phone}`}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </a>
          </Button>
        )}
      </div>

      {/* Portal Link */}
      {portalUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          asChild
        >
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View client portal
          </a>
        </Button>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-lg font-semibold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
