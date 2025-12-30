"use client";

import React, { useState } from "react";
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
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {memberships.map((membership) => (
        <button
          key={membership.clientId}
          type="button"
          onClick={() => handleSelect(membership.clientId)}
          disabled={isSubmitting}
          className="w-full p-4 text-left bg-base-200 hover:bg-base-300 rounded-lg transition flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex-1">
            <div className="font-medium text-lg">{membership.clientName}</div>
            <div className="text-sm text-base-content/70 capitalize">
              {membership.role}
            </div>
          </div>
          <svg
            className="w-5 h-5 text-base-content/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      ))}
      
      {isSubmitting && (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
    </div>
  );
}

