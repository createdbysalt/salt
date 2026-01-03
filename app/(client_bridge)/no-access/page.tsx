import Link from "next/link";

/**
 * No Access Page for Bridge
 * Shown when a user is authenticated but doesn't have access to any Bridge portals
 */
export default function NoAccessPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card bg-card shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
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
          <p className="text-muted-foreground mb-6">
            You&apos;re signed in, but you don&apos;t have access to the bridge yet. Ask
            your studio to send you an invitation.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link href="/signin" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Try a Different Account
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
              Back to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-base-300">
            <p className="text-sm text-foreground/60">
              If you believe this is an error, contact your studio for support.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

