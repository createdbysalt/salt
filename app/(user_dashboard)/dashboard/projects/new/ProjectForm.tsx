"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createProject } from "./actions";

interface Client {
  id: string;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export function ProjectForm({
  clients,
  preselectedClient,
}: {
  clients: Client[];
  preselectedClient?: string;
}) {
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
    
    const result = await createProject(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // If successful, the action will redirect
  };
  
  return (
    <form action={handleSubmit} className="space-y-6">
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
      
      {/* Project Name */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Project Name *</span>
        </label>
        <input
          type="text"
          name="name"
          required
          maxLength={100}
          placeholder="e.g., Website Redesign"
          className="input input-bordered"
          onChange={handleNameChange}
        />
        <label className="label">
          <span className="label-text-alt">What are you building?</span>
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
          placeholder="e.g., website-redesign"
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt">
            Used in URLs (lowercase letters, numbers, hyphens only)
          </span>
        </label>
      </div>
      
      {/* Client */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Client *</span>
        </label>
        <select
          name="client_id"
          required
          className="select select-bordered"
          defaultValue={preselectedClient || ""}
        >
          <option value="" disabled>
            Select a client
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
              {(client.contact_email || client.contact_phone) && 
                ` — ${client.contact_email || client.contact_phone}`
              }
            </option>
          ))}
        </select>
        <label className="label">
          <span className="label-text-alt">Who is this project for?</span>
        </label>
      </div>
      
      {/* Description */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Description</span>
        </label>
        <textarea
          name="description"
          maxLength={500}
          rows={3}
          placeholder="Brief description of the project..."
          className="textarea textarea-bordered"
        />
        <label className="label">
          <span className="label-text-alt">Optional project overview</span>
        </label>
      </div>
      
      {/* Project Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Project Type</span>
        </label>
        <input
          type="text"
          name="project_type"
          maxLength={50}
          placeholder="e.g., Website, App, Branding"
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt">Optional categorization</span>
        </label>
      </div>
      
      {/* Status */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Initial Status</span>
        </label>
        <select name="status" className="select select-bordered" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
        <label className="label">
          <span className="label-text-alt">You can change this later</span>
        </label>
      </div>
      
      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary flex-1"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating...
            </>
          ) : (
            "Create Project"
          )}
        </button>
        <Link href="/dashboard/projects" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

