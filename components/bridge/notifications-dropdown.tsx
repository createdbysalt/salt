"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface NotificationsDropdownProps {
  notifications?: Notification[];
}

export function NotificationsDropdown({ notifications = [] }: NotificationsDropdownProps) {
  const [unreadCount] = useState(notifications.filter(n => !n.read).length);

  // Mock notifications for MVP
  const mockNotifications: Notification[] = [
    {
      id: "1",
      title: "Request Update",
      message: "Your website redesign request is now in progress",
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      read: false,
    },
    {
      id: "2",
      title: "File Uploaded",
      message: "New deliverable added to Growth Retainer project",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      read: false,
    },
    {
      id: "3",
      title: "Request Completed",
      message: "Update homepage banner has been completed",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      read: true,
    },
  ];

  const displayNotifications = notifications.length > 0 ? notifications : mockNotifications;
  const displayUnreadCount = unreadCount > 0 ? unreadCount : mockNotifications.filter(n => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {displayUnreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {displayUnreadCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {displayUnreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {displayNotifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {displayNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-primary cursor-pointer">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

