import Link from "next/link";
import config from "@/config";

/**
 * No Access Page for Bridge
 * Shown when a user is authenticated but doesn't have access to any Bridge portals
 */
export default function NoAccessPage() {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">No Access Yet</h1>

          {/* Message */}
          <p className="text-base-content/70 mb-6">
            You're signed in, but you don't have access to the bridge yet. Ask
            your studio to send you an invitation.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link href="/signin" className="btn btn-primary">
              Try a Different Account
            </Link>
            <Link href="/" className="btn btn-ghost btn-sm">
              Back to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-base-300">
            <p className="text-sm text-base-content/60">
              If you believe this is an error, contact your studio for support.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

