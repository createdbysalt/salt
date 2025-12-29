"use client";

import React, { useState } from "react";
import { inviteClientUser, revokeClientUser } from "./actions";

type ClientUser = {
  id: string;
  email: string;
  role: string;
  user_id: string;
  created_at: string;
};

export function ClientUsersSection({
  clientId,
  clientUsers,
}: {
  clientId: string;
  clientUsers: ClientUser[];
}) {
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await inviteClientUser(clientId, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Invite sent successfully!");
      setEmail("");
      // Reset form
      e.currentTarget.reset();
    }

    setIsInviting(false);
  };

  const handleRevoke = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${userEmail}?`)) {
      return;
    }

    const result = await revokeClientUser(clientId, userId);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Access revoked successfully");
    }
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Client Users</h2>
        <p className="text-sm text-base-content/70 mb-4">
          Invite users to access this client&apos;s Bridge portal
        </p>

        {/* Status Messages */}
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

        {success && (
          <div className="alert alert-success">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="input input-bordered flex-1"
              required
              disabled={isInviting}
            />
            <select
              name="role"
              className="select select-bordered"
              disabled={isInviting}
              defaultValue="client"
            >
              <option value="client">Client</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isInviting}
            >
              {isInviting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Inviting...
                </>
              ) : (
                "Invite"
              )}
            </button>
          </div>
        </form>

        <div className="divider"></div>

        {/* Current Users List */}
        {clientUsers.length === 0 ? (
          <div className="text-center py-4 text-base-content/50">
            <p>No users invited yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
              >
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-xs text-base-content/70">
                    {user.role} • Invited{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(user.user_id, user.email)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

