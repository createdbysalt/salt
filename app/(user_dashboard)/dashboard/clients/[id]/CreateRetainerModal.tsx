"use client";

import { useState } from "react";
import { createBridgeRetainerCheckoutAction } from "@/app/actions/billing/connect-actions";
import type { ErrorResponse } from "@/app/actions/billing/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Mail, Check, ExternalLink, Loader2 } from "lucide-react";

interface CreateRetainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

type Phase = "form" | "link";

export function CreateRetainerModal({
  isOpen,
  onClose,
  clientId,
}: CreateRetainerModalProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset form when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPhase("form");
      setAmount("");
      setInterval("month");
      setDescription("");
      setError(null);
      setCheckoutUrl(null);
      setCopied(false);
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

    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/bridge/retainer/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/dashboard/clients/${clientId}`;

    const result = await createBridgeRetainerCheckoutAction({
      retainerData: {
        clientId,
        amountCents,
        currency: "usd",
        interval,
        intervalCount: 1,
        description: description.trim(),
      },
      successUrl,
      cancelUrl,
    });

    if (result.ok) {
      setCheckoutUrl(result.data.url);
      setPhase("link");
    } else {
      setError((result as ErrorResponse).message);
    }

    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (checkoutUrl) {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailClick = () => {
    if (checkoutUrl) {
      const intervalLabel = interval === "month" ? "monthly" : "yearly";
      const subject = encodeURIComponent(
        `Your ${intervalLabel} retainer subscription`
      );
      const body = encodeURIComponent(
        `Hello,\n\nPlease use the link below to set up your ${intervalLabel} retainer subscription for $${amountValue.toFixed(2)}/${interval}.\n\nDescription: ${description}\n\nClick here to subscribe: ${checkoutUrl}\n\nThank you for your business!`
      );
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const formattedAmount = isAmountValid
    ? `$${amountValue.toFixed(2)}/${interval}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {phase === "form" ? "Set Up Retainer" : "Retainer Link Ready"}
          </DialogTitle>
          <DialogDescription>
            {phase === "form"
              ? "Create a recurring subscription for this client."
              : "Share the subscription link with your client."}
          </DialogDescription>
        </DialogHeader>

        {phase === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="retainer-amount">Amount ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="retainer-amount"
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

            {/* Billing Interval */}
            <div className="space-y-2">
              <Label htmlFor="retainer-interval">Billing Interval</Label>
              <Select
                value={interval}
                onValueChange={(value: "month" | "year") => setInterval(value)}
              >
                <SelectTrigger id="retainer-interval">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="retainer-description">Description</Label>
              <Input
                id="retainer-description"
                type="text"
                placeholder="e.g., Monthly website maintenance"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                required
              />
            </div>

            {/* Summary */}
            {isFormValid && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your client will be billed{" "}
                  <span className="font-medium text-foreground">
                    {formattedAmount}
                  </span>{" "}
                  for {description}.
                </p>
              </div>
            )}

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
                    Generating Link...
                  </>
                ) : (
                  "Create Retainer"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Success Summary */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                Retainer subscription link generated for{" "}
                <span className="font-medium">{formattedAmount}</span>
              </p>
            </div>

            {/* Link Display */}
            <div className="space-y-2">
              <Label htmlFor="checkout-link">Subscription Link</Label>
              <div className="flex gap-2">
                <Input
                  id="checkout-link"
                  value={checkoutUrl || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              This link expires in 24 hours. Once your client completes the
              checkout, the retainer will be active.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailClick}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Open in Email Client
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => window.open(checkoutUrl || "", "_blank")}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Checkout Page
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
