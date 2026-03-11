export const dynamic = "force-dynamic";

/**
 * Expired/revoked invoice link page
 * Shown when a payment link has expired or been revoked
 * Path: /bridge/invoices/[token]/expired
 */
export default async function BridgeInvoiceExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        {/* Expired Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-6">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2">Link Expired</h1>

        <p className="text-gray-500 mb-6">
          This payment link has expired or is no longer valid.
        </p>

        {/* What to Do */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="font-medium mb-2">What to do next:</p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Contact the studio that sent you this invoice</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Request a new payment link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Links are valid for 30 days from the time they&apos;re sent</span>
            </li>
          </ul>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-400">
          Payment links expire for security reasons. If you believe this is an error, please reach
          out to the studio directly.
        </p>
      </div>
    </div>
  );
}
