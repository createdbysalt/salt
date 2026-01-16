"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Copy, Mail, Check, ExternalLink, Loader2 } from "lucide-react";
import { sendInvoiceAction } from "@/app/_features/billing/actions";
import type { ErrorResponse } from "@/app/_features/billing/types";

type SendInvoiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
};

export function SendInvoiceDialog({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  amount,
}: SendInvoiceDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    setError(null);

    const result = await sendInvoiceAction({ invoiceId });

    if (result.ok) {
      setPaymentLink(result.data.paymentUrl);
      setExpiresAt(result.data.expiresAt);
      router.refresh();
    } else {
      setError((result as ErrorResponse).message);
    }

    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (paymentLink) {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailClick = () => {
    if (paymentLink) {
      const subject = encodeURIComponent(`Invoice ${invoiceNumber} - ${amount}`);
      const body = encodeURIComponent(
        `Hello,\n\nPlease find your invoice for ${amount} ready for payment.\n\nClick here to view and pay: ${paymentLink}\n\nThis link expires on ${expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "30 days"}.\n\nThank you for your business!`
      );
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const handleClose = () => {
    setPaymentLink(null);
    setExpiresAt(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paymentLink ? "Invoice Sent" : "Send Invoice"}
          </DialogTitle>
          <DialogDescription>
            {paymentLink
              ? "Share the payment link with your client."
              : `Send invoice ${invoiceNumber} for ${amount} to your client.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {!paymentLink ? (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will generate a secure payment link valid for 30 days. The
              invoice status will be updated to &quot;Sent&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-link">Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  id="payment-link"
                  value={paymentLink}
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
              Link expires on{" "}
              {expiresAt
                ? new Date(expiresAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "30 days from now"}
            </p>

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
                onClick={() => window.open(paymentLink, "_blank")}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Payment Page
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!paymentLink ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSend} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  "Generate Payment Link"
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
