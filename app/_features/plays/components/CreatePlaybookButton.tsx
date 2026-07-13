"use client";

import { useState } from "react";
import { Plus, Sparkles, Construction } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui";
import { cn } from "@repo/utils";

type CreatePlaybookButtonProps = {
  className?: string;
};

export function CreatePlaybookButton({ className }: CreatePlaybookButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "h-9 shrink-0 rounded-full border-border/60 bg-card px-3.5 gap-1.5 text-sm font-medium text-foreground shadow-none hover:border-border hover:bg-muted/40",
          className
        )}
      >
        <Plus className="size-3.5" strokeWidth={2.25} />
        Create playbook
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto size-12 rounded-full bg-muted grid place-items-center mb-2">
              <Construction className="size-6 text-muted-foreground" />
            </div>
            <DialogTitle className="text-center">
              Custom Playbooks Coming Soon
            </DialogTitle>
            <DialogDescription className="text-center">
              Soon you'll be able to create your own playbooks with custom
              triggers, steps, and outputs. For now, Salt's built-in playbooks
              have you covered.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-muted/50 p-4 space-y-3 mt-2">
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 text-violet shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI-Assisted Creation</p>
                <p className="text-xs text-muted-foreground">
                  Describe what you want and Salt will build the playbook
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 text-sky shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Template Library</p>
                <p className="text-xs text-muted-foreground">
                  Start from Salt templates and customize to your needs
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
