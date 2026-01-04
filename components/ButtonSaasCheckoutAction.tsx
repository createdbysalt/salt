"use client";

import { redirectToSaasCheckoutAction } from "@/app/actions/billing/redirect-actions";
import { useState } from "react";

interface ButtonSaasCheckoutActionProps {
  priceId: string;
  tier: string;
  interval?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Button component for SaaS subscription checkout using Server Actions
 * Replaces the legacy API route-based ButtonCheckout for subscription flows
 */
export default function ButtonSaasCheckoutAction({
  priceId,
  tier,
  interval = "month",
  children,
  className,
}: ButtonSaasCheckoutActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await redirectToSaasCheckoutAction(formData);
    } catch (error) {
      console.error("Checkout failed:", error);
      setIsLoading(false);
    }
  };
  
  const currentUrl = typeof window !== "undefined" ? window.location.href : "/pricing";
  
  return (
    <form action={handleSubmit}>
      <input type="hidden" name="priceId" value={priceId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="interval" value={interval} />
      <input type="hidden" name="successUrl" value={`${currentUrl}?success=true`} />
      <input type="hidden" name="cancelUrl" value={currentUrl} />
      
      <button
        type="submit"
        disabled={isLoading}
        className={
          className ||
          "w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
        ) : (
          children || "Get Started"
        )}
      </button>
    </form>
  );
}




