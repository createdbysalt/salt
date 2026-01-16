"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Sparkles, PartyPopper } from "lucide-react";

type SetupCelebrationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SetupCelebrationModal({
  open,
  onOpenChange,
}: SetupCelebrationModalProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                <PartyPopper className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-success animate-bounce">
                <Sparkles className="h-4 w-4 text-success-foreground" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Setup Complete!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You&apos;re all set and ready to start building amazing things with Salt
            Core.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">What&apos;s Next?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Create your first project and run an AI audit</li>
              <li>• Invite team members to collaborate</li>
              <li>• Explore automation and integrations</li>
            </ul>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            size="lg"
          >
            Explore Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

