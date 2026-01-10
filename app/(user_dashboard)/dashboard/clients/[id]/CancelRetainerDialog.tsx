"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cancelBridgeRetainerAction } from "@/app/actions/billing/connect-actions";
import { type ErrorResponse } from "@/app/actions/billing/schemas";

type CancelRetainerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  amount: string;
  interval: string;
  periodEndDate: string;
};

export function CancelRetainerDialog({
  isOpen,
  onClose,
  subscriptionId,
  amount,
  interval,
  periodEndDate,
}: CancelRetainerDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await cancelBridgeRetainerAction({
        subscriptionId,
        immediately: false, // Cancel at period end
      });

      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError((result as ErrorResponse).message);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <DialogTitle>Cancel Retainer</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Are you sure you want to cancel this retainer subscription?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subscription Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{amount}/{interval}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cancels on</span>
              <span className="font-medium">{periodEndDate}</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              The subscription will remain active until the end of the current billing period
              ({periodEndDate}). The client will not be charged again after this date.
            </p>
            <p>
              You can set up a new retainer at any time if needed.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Keep Retainer
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Canceling..." : "Cancel Retainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
