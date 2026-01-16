"use client";

import { Button } from "@/app/_components/ui/button";
import { X } from "lucide-react";
import type { Meeting } from "../types";
import { cn } from "@repo/utils";
import { MeetingDetailContent } from "./MeetingDetailContent";

interface MeetingDetailPanelProps {
  meeting: Meeting | null;
  onClose: () => void;
}

export function MeetingDetailPanel({ meeting, onClose }: MeetingDetailPanelProps) {
  const isOpen = !!meeting;

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed top-16 right-0 bottom-0 w-[28rem] flex-col border-l border-border bg-sidebar z-20",
        "transition-transform duration-200 ease-in-out will-change-transform",
        isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      {/* Content */}
      {meeting ? (
        <div className="flex-1 overflow-y-auto relative p-4">
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-3 top-3 z-10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
          <MeetingDetailContent meeting={meeting} onClose={onClose} />
        </div>
      ) : null}
    </aside>
  );
}


