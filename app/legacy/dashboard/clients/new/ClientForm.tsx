"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "./actions";

export function ClientForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    const slugInput = document.getElementById("slug") as HTMLInputElement;
    if (slugInput) {
      slugInput.value = slug;
    }
  };
  
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);
    
    const result = await createClient(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // If successful, the action will redirect
  };
  
  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
      
      {/* Client Name */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Client Name *</span>
        </label>
        <input
          type="text"
          name="name"
          required
          maxLength={100}
          placeholder="e.g., Acme Inc"
          className="input input-bordered"
          onChange={handleNameChange}
        />
        <label className="label">
          <span className="label-text-alt">The client&apos;s name or organization</span>
        </label>
      </div>
      
      {/* Slug */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Slug *</span>
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          required
          maxLength={50}
          pattern="[a-z0-9-]+"
          placeholder="e.g., acme-inc"
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt">
            Used in URLs (lowercase letters, numbers, hyphens only)
          </span>
        </label>
      </div>
      
      {/* Contact Email */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Contact Email</span>
        </label>
        <input
          type="email"
          name="contact_email"
          placeholder="contact@client.com"
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt">Primary contact email (optional)</span>
        </label>
      </div>
      
      {/* Contact Phone */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Contact Phone</span>
        </label>
        <input
          type="tel"
          name="contact_phone"
          maxLength={50}
          placeholder="+1 (555) 123-4567"
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt">Primary contact phone (optional)</span>
        </label>
      </div>
      
      {/* Info Box */}
      <div className="rounded-lg border border-info/50 bg-info/10 px-4 py-3 text-sm text-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          A Bridge portal will be automatically created for this client at{" "}
          <code className="font-mono">bridge.saltcore.dev/[slug]</code>
        </span>
      </div>
      
      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              Creating...
            </>
          ) : (
            "Create Client"
          )}
        </button>
        <Link href="/dashboard/clients" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
          Cancel
        </Link>
      </div>
    </form>
  );
}

