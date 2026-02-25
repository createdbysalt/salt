"use client";

import { useState } from "react";
import { createConnectAccountAction, createConnectOnboardingLinkAction } from "@/app/_features/billing/actions";
import { type ErrorResponse } from "@/app/_features/billing/types";
import { safeStripeHostedUrl } from "@/app/_lib/security/safe-url";

interface ConnectStatusCardProps {
  studioId: string;
  connectAccountId: string | null;
  connectStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export default function ConnectStatusCard({
  studioId: _studioId,
  connectAccountId: _connectAccountId,
  connectStatus,
  chargesEnabled,
  payoutsEnabled,
}: ConnectStatusCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isNotCreated = connectStatus === "not_created";
  const isOnboarding = connectStatus === "onboarding" || connectStatus === "pending";
  const isActive = chargesEnabled && payoutsEnabled;
  const needsInfo = (connectStatus === "created" || connectStatus === "pending") && !chargesEnabled;
  
  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create Connect account with proper parameters
      const result = await createConnectAccountAction({
        country: "US",
        businessType: "individual",
        returnUrl: window.location.href,
        refreshUrl: window.location.href,
      });

      if (!result.ok) {
        setError((result as ErrorResponse).message || "Failed to create Connect account");
        setIsLoading(false);
        return;
      }

      // Redirect to onboarding URL returned from account creation
      const safeUrl = safeStripeHostedUrl(result.data.onboardingUrl);
      if (!safeUrl) {
        setError("Invalid onboarding URL");
        setIsLoading(false);
        return;
      }
      window.location.href = safeUrl;
    } catch (err) {
      console.error("Connect account creation failed:", err);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };
  
  const handleContinueOnboarding = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createConnectOnboardingLinkAction({
        returnUrl: window.location.href,
        refreshUrl: window.location.href,
      });
      
      if (result.ok && result.data?.url) {
        const safeUrl = safeStripeHostedUrl(result.data.url);
        if (!safeUrl) {
          setError("Invalid onboarding URL");
          setIsLoading(false);
          return;
        }
        window.location.href = safeUrl;
      } else {
        setError("Failed to create onboarding link");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Onboarding link failed:", err);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Client Billing (The Bridge)</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Set up Stripe Connect to accept payments from your clients
          </p>
        </div>
        
        {/* Status Badge */}
        <div>
          {isActive && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          )}
          {isOnboarding && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Setup Required
            </span>
          )}
          {isNotCreated && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              Not Set Up
            </span>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* Not Created State */}
      {isNotCreated && (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Accept client payments</p>
                <p className="text-sm text-muted-foreground">Invoice clients and receive payments directly</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Recurring retainers</p>
                <p className="text-sm text-muted-foreground">Set up automated monthly billing for clients</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">0% platform fees</p>
                <p className="text-sm text-muted-foreground">Keep 100% of your client revenue (Stripe fees apply)</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Setting up..." : "Set Up Client Billing"}
          </button>
          
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Powered by Stripe Connect. Takes about 5 minutes to complete.
          </p>
        </>
      )}
      
      {/* Onboarding/Incomplete State */}
      {(isOnboarding || needsInfo) && (
        <>
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold">Action Required</p>
            <p className="text-sm text-yellow-700 mt-1">
              You need to complete your Stripe Connect onboarding before you can accept client payments.
            </p>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Charges Enabled</span>
              <span className={chargesEnabled ? "text-green-600 font-semibold" : "text-gray-500"}>
                {chargesEnabled ? "✓ Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payouts Enabled</span>
              <span className={payoutsEnabled ? "text-green-600 font-semibold" : "text-gray-500"}>
                {payoutsEnabled ? "✓ Yes" : "No"}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleContinueOnboarding}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Continue Setup"}
          </button>
        </>
      )}
      
      {/* Active State */}
      {isActive && (
        <>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-800 font-semibold">
                Client billing is active
              </p>
            </div>
            <p className="text-sm text-green-700 mt-1">
              You can now send invoices and create recurring retainers for your clients.
            </p>
          </div>
          
          <div className="flex gap-3">
            <a
              href="/studio/clients"
              className="flex-1 text-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Manage Clients
            </a>
            <a
              href="https://dashboard.stripe.com/connect/accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Stripe Dashboard →
            </a>
          </div>
        </>
      )}
    </div>
  );
}


