"use client";

/**
 * SignatureCapture Component
 *
 * Captures typed signatures for proposal acceptance with full audit trail.
 * Collects signature name, IP address, user agent, and optional geolocation.
 *
 * IMPORTANT: Checkbox is unchecked by default for legal validity.
 */

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import type { SignProposalInput, SignatureGeolocation } from "../types";

interface SignatureCaptureProps {
  proposalId: string;
  recipientEmail: string;
  termsText?: string;
  onSign: (input: SignProposalInput) => Promise<{ ok: boolean; message?: string }>;
  onSuccess?: () => void;
}

export function SignatureCapture({
  proposalId,
  recipientEmail,
  termsText = "I have read, understood, and agree to the terms and conditions outlined in this proposal.",
  onSign,
  onSuccess,
}: SignatureCaptureProps) {
  // State for form inputs
  const [signatureName, setSignatureName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false); // MUST start unchecked for legal validity
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Transition for non-blocking UI during server action
  const [isPending, startTransition] = useTransition();

  // Validation
  const isValid = signatureName.trim().length >= 2 && termsAccepted;

  // Get client IP address from external service
  const getClientIp = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("https://api.ipify.org?format=json", {
        cache: "no-store",
      });
      const data = await response.json();
      return data.ip || "unknown";
    } catch {
      return "unknown";
    }
  }, []);

  // Get optional geolocation if available
  const getGeolocation = useCallback(async (): Promise<SignatureGeolocation | undefined> => {
    // Only request if geolocation API is available and user permits
    if (!navigator.geolocation) return undefined;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      // Geolocation denied or unavailable - this is optional, so we continue
      return undefined;
    }
  }, []);

  // Handle signature submission
  const handleSign = useCallback(async () => {
    if (!isValid) return;

    setError(null);

    startTransition(async () => {
      try {
        // Gather audit trail data
        const [clientIp, geolocation] = await Promise.all([
          getClientIp(),
          getGeolocation(),
        ]);

        const input: SignProposalInput = {
          proposal_id: proposalId,
          signature_name: signatureName.trim(),
          signature_email: recipientEmail,
          signature_ip: clientIp,
          signature_user_agent: navigator.userAgent,
          signature_geolocation: geolocation,
        };

        const result = await onSign(input);

        if (result.ok) {
          setSuccess(true);
          onSuccess?.();
        } else {
          setError(result.message || "Failed to sign proposal. Please try again.");
        }
      } catch (err) {
        console.error("Error signing proposal:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }, [isValid, proposalId, signatureName, recipientEmail, getClientIp, getGeolocation, onSign, onSuccess]);

  // Show success state
  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-700 mb-2">
          Proposal Accepted
        </h3>
        <p className="text-muted-foreground">
          Thank you! Your signature has been recorded and the proposal has been accepted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Signature Name Input */}
      <div className="space-y-2">
        <Label htmlFor="signature-name" className="text-base font-medium">
          Full Legal Name
        </Label>
        <Input
          id="signature-name"
          type="text"
          placeholder="Enter your full legal name"
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          disabled={isPending}
          className="text-lg"
          autoComplete="name"
        />
        <p className="text-xs text-muted-foreground">
          This will serve as your electronic signature.
        </p>
      </div>

      {/* Terms Agreement Checkbox */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms-agreement"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          disabled={isPending}
          className="mt-1"
        />
        <Label
          htmlFor="terms-agreement"
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          {termsText}
        </Label>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sign Button */}
      <Button
        onClick={handleSign}
        disabled={!isValid || isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing...
          </>
        ) : (
          "Sign & Accept Proposal"
        )}
      </Button>

      {/* Legal Notice */}
      <p className="text-xs text-center text-muted-foreground">
        By clicking "Sign & Accept Proposal", you agree that your electronic signature
        is the legal equivalent of your manual signature on this proposal.
      </p>
    </div>
  );
}
