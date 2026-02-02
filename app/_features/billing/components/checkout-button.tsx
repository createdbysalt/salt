"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createSaasCheckoutSessionAction } from "@/app/actions/billing/saas-actions";
import { type ErrorResponse } from "@/app/actions/billing/schemas";
import { toast } from "sonner";

interface CheckoutButtonProps {
  tier: "solo" | "professional" | "studio";
  interval: "month" | "year";
  highlighted?: boolean;
}

export function CheckoutButton({
  tier,
  interval,
  highlighted,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/studio?subscription=success`;
      const cancelUrl = `${baseUrl}/pricing`;

      const result = await createSaasCheckoutSessionAction({
        tier,
        interval,
        successUrl,
        cancelUrl,
      });

      if (result.ok) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url;
      } else {
        // Handle specific error cases
        const { errorCode, message } = result as ErrorResponse;
        if (errorCode === "UNAUTHORIZED") {
          toast.error("Please sign in to subscribe", {
            action: {
              label: "Sign In",
              onClick: () => router.push("/signin"),
            },
          });
        } else if (errorCode === "ALREADY_SUBSCRIBED") {
          toast.error("You already have an active subscription", {
            action: {
              label: "Dashboard",
              onClick: () => router.push("/studio/settings/billing"),
            },
          });
        } else {
          toast.error(message || "Failed to start checkout");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      loading={loading}
      className="w-full"
      variant={highlighted ? "default" : "outline"}
      size="lg"
    >
      Get Started
    </Button>
  );
}
