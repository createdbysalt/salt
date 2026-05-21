"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function SubscriptionSuccessToast(): React.ReactNode {
  useEffect(() => {
    toast.success("Subscription activated!", {
      description: "Welcome to Salt. Your subscription is now active.",
      duration: 5000,
    });
  }, []);

  return null;
}
