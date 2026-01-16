"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/_components/ui/sheet";
import {
  BookOpen,
  Video,
  MessageCircle,
  Keyboard,
  Sparkles,
  Bug,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

const helpItems = [
  {
    icon: BookOpen,
    label: "Documentation",
    description: "Browse guides and API references",
    href: "https://docs.salt.studio",
    external: true,
  },
  {
    icon: Video,
    label: "Video Tutorials",
    description: "Watch step-by-step walkthroughs",
    href: "/help/tutorials",
    external: false,
  },
  {
    icon: MessageCircle,
    label: "Contact Support",
    description: "Get help from our team",
    href: "mailto:support@salt.studio",
    external: true,
  },
  {
    icon: Keyboard,
    label: "Keyboard Shortcuts",
    description: "Learn productivity shortcuts",
    action: "shortcuts",
  },
  {
    icon: Sparkles,
    label: "What's New",
    description: "Latest features and updates",
    href: "/changelog",
    external: false,
  },
  {
    icon: Bug,
    label: "Report a Bug",
    description: "Help us improve Salt",
    href: "https://github.com/Salt-Core/core-platform/issues/new",
    external: true,
  },
];

export function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleItemClick = (item: typeof helpItems[0]) => {
    if (item.action === "shortcuts") {
      setShowShortcuts(true);
      return;
    }

    if (item.href) {
      if (item.external) {
        const newWindow = window.open(item.href, "_blank", "noopener,noreferrer");
        if (newWindow) newWindow.opener = null;
      } else {
        window.location.href = item.href;
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-primary"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help & Resources
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px]">
        {!showShortcuts ? (
          <>
            <SheetHeader>
              <SheetTitle>Help & Resources</SheetTitle>
              <SheetDescription>
                Get help, learn new features, and stay up to date
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {helpItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.label}</p>
                        {item.external && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Salt Core v1.0.0 • Made with ❤️
              </p>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Keyboard Shortcuts</SheetTitle>
              <SheetDescription>
                Boost your productivity with these shortcuts
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Navigation</h4>
                <div className="space-y-2">
                  <ShortcutRow shortcut="⌘ K" description="Open command palette" />
                  <ShortcutRow shortcut="⌘ /" description="Toggle sidebar" />
                  <ShortcutRow shortcut="⌘ ." description="Open settings" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Actions</h4>
                <div className="space-y-2">
                  <ShortcutRow shortcut="⌘ N" description="New project" />
                  <ShortcutRow shortcut="⌘ S" description="Save changes" />
                  <ShortcutRow shortcut="⌘ E" description="Export data" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">General</h4>
                <div className="space-y-2">
                  <ShortcutRow shortcut="⌘ ?" description="Show help menu" />
                  <ShortcutRow shortcut="Esc" description="Close dialog/sheet" />
                  <ShortcutRow shortcut="⌘ Z" description="Undo" />
                  <ShortcutRow shortcut="⌘ ⇧ Z" description="Redo" />
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(false)}
                className="w-full"
              >
                ← Back to Help Menu
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
        {shortcut}
      </kbd>
    </div>
  );
}


