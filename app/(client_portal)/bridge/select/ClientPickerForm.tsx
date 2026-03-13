"use client";

import React, { useState } from "react";
import { ChevronRightIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { selectClient } from "./actions";

type ClientMembership = {
  clientId: string;
  clientName: string;
  role: string;
  portalId: string;
  studioId: string;
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

      {memberships.map((membership) => (
        <button
          key={membership.clientId}
          type="button"
          onClick={() => handleSelect(membership.clientId)}
          disabled={isSubmitting}
          className="w-full p-4 text-left bg-background hover:bg-muted border rounded-lg transition flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex-1">
            <div className="font-medium text-lg">{membership.clientName}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {membership.role}
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
        </button>
      ))}

      {isSubmitting && (
        <div className="flex justify-center py-4">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
