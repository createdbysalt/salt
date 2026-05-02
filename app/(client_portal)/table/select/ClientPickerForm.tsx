"use client";

import React, { useState } from "react";
import { ChevronRightIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { selectClient } from "./actions";
import type { ResolvedBrandingConfig } from "@/app/_lib/table/branding-config";

interface StudioInfo {
  id: string;
  name: string;
  branding: ResolvedBrandingConfig;
}

type ClientMembership = {
  clientId: string;
  clientName: string;
  role: string;
  portalId: string;
  studioId: string;
  studio?: StudioInfo;
};

export function ClientPickerForm({
  memberships,
}: {
  memberships: ClientMembership[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (clientId: string) => {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("clientId", clientId);

    const result = await selectClient(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // If successful, redirect happens automatically via server action
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {memberships.map((membership) => {
        const studio = membership.studio;
        const accentColor = studio?.branding?.colors?.accent || "#6366F1";
        const logoUrl =
          studio?.branding?.logo?.darkUrl || studio?.branding?.logo?.lightUrl;

        return (
          <button
            key={membership.clientId}
            type="button"
            onClick={() => handleSelect(membership.clientId)}
            disabled={isSubmitting}
            className="w-full p-4 text-left bg-background hover:bg-muted border rounded-xl transition flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Studio logo or letter avatar */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={studio?.name || ""}
                className="h-10 w-10 object-contain rounded-lg"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-lg shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {(studio?.name || membership.clientName).charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-medium text-base truncate">
                {membership.clientName}
              </div>
              <div className="text-sm text-muted-foreground">
                {studio?.name || "Studio"}
              </div>
            </div>

            <ChevronRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        );
      })}

      {isSubmitting && (
        <div className="flex justify-center py-4">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
