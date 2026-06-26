"use client";

import { useState } from "react";
import { Search, MessageSquare, Bell } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/_components/ui/sheet";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";

/**
 * Dashboard header - Reddit-style layout
 * Layout: Logo (left) | Search (center) | Chat, Notifications, User (right)
 */
export function DashboardHeader({ user }: { user: User }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Extract user name from metadata or email with multiple fallbacks
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    // Combine first + last name if available
    (user.user_metadata?.first_name && user.user_metadata?.last_name 
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
      : null) ||
    user.user_metadata?.first_name ||
    user.email?.split("@")[0] ||
    "User";

  // Get avatar URL
  const avatarUrl = user.user_metadata?.avatar_url;

  // Get initials for fallback
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    // Trigger Command Palette via keyboard event
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      <div className="flex flex-1 items-center gap-4">
        {/* Search Bar - spans to action icons */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Check performance... Scan competitors... What's broken? (⌘K)"
              className="pl-10 w-full"
              onFocus={handleSearchFocus}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Chat Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setChatOpen(true)}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Chat</span>
          </Button>

          {/* Notifications Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {/* Badge for unread count (placeholder) */}
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Avatar + Name */}
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 h-10"
            asChild
          >
            <Link href="?settings=general">
              <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-primary text-primary-foreground text-sm font-medium shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="text-sm font-medium hidden lg:inline">{userName}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Messages</SheetTitle>
            <SheetDescription>
              Your recent conversations and messages
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Your conversations will appear here
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications Sheet */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Stay updated with your latest activity
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Placeholder notifications */}
            <div className="space-y-3">
              {[
                {
                  title: "Expansion opportunity found",
                  description: "Luma Health referral-site signal is ready for review",
                  time: "2 hours ago",
                  unread: true,
                },
                {
                  title: "Kickoff memory organized",
                  description: "Atlas Coaching onboarding context is ready to approve",
                  time: "5 hours ago",
                  unread: true,
                },
                {
                  title: "Payment reminder drafted",
                  description: "$4,200 Brightline Legal invoice is due today",
                  time: "1 day ago",
                  unread: false,
                },
              ].map((notification, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                    notification.unread ? "bg-primary/5 border-primary/20" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notification.unread && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

