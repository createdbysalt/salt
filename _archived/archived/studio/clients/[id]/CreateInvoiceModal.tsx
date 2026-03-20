"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBridgeInvoiceAction } from "@/app/_features/billing/actions";
import type { ErrorResponse } from "@/app/_features/billing/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Loader2 } from "lucide-react";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  clientId,
}: CreateInvoiceModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    // Default to 30 days from now
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount("");
      setDescription("");
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setDueDate(date.toISOString().split("T")[0]);
      setError(null);
      onClose();
    }
  };

  // Validate amount (>= $1.00)
  const amountValue = parseFloat(amount);
  const isAmountValid = !isNaN(amountValue) && amountValue >= 1;
  const isFormValid = isAmountValid && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);

    // Convert dollars to cents
    const amountCents = Math.round(amountValue * 100);

    const result = await createBridgeInvoiceAction({
      clientId,
      amountCents,
      currency: "usd",
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
    });

    if (result.ok) {
      // Refresh the page to show the new invoice
      router.refresh();
      handleOpenChange(false);
    } else {
      setError((result as ErrorResponse).message);
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for this client. The invoice will be saved as a draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
            {amount && !isAmountValid && (
              <p className="text-sm text-destructive">
                Amount must be at least $1.00
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g., Website design deposit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              required
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
            <p className="text-xs text-muted-foreground">
              Default: 30 days from today
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
