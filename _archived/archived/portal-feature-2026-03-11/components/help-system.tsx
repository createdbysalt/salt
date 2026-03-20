"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/_components/ui/sheet";
import { Input } from "@/app/_components/ui/input";
import { HelpCircle, Search, BookOpen, Video, MessageSquare, FileQuestion } from "lucide-react";
import Link from "next/link";

interface HelpSystemProps {
  className?: string;
}

export function HelpSystem({ className }: HelpSystemProps) {
  const [open, setOpen] = useState(false);

  const quickActions = [
    {
      icon: BookOpen,
      label: "Getting started guide",
      href: "#getting-started",
    },
    {
      icon: Video,
      label: "Video tutorials",
      href: "#tutorials",
    },
    {
      icon: FileQuestion,
      label: "Common questions",
      href: "#faq",
    },
    {
      icon: MessageSquare,
      label: "Message the studio",
      href: "/messages",
    },
  ];

  const popularArticles = [
    "How to download files",
    "Understanding Intelligence reports",
    "Submitting a request",
    "Reading performance metrics",
  ];

  return (
    <>
      {/* Floating Help Button */}
      <Button
        size="lg"
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 w-14 md:h-auto md:w-auto md:px-6 ${className}`}
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">Help</span>
      </Button>

      {/* Help Panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Help & Support</SheetTitle>
            <SheetDescription>
              How can we help you today?
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
              <div className="grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      asChild
                    >
                      <Link href={action.href} onClick={() => setOpen(false)}>
                        <Icon className="h-4 w-4 mr-3" />
                        {action.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search Help */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Search help</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="How do I..."
                  className="pl-9"
                  disabled
                />
              </div>
            </div>

            {/* Popular Articles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Popular Articles</h3>
              <div className="space-y-2">
                {popularArticles.map((article) => (
                  <button
                    key={article}
                    className="w-full text-left text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                    • {article}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Studio */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="text-sm font-semibold mb-2">Need more help?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Our team is here to help. Send us a message and we'll get back to you quickly.
              </p>
              <Button variant="default" size="sm" className="w-full" asChild>
                <Link href="/messages" onClick={() => setOpen(false)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message the studio
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
