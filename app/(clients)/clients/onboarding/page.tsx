import { ClipboardCheck } from "lucide-react";

/**
 * Clients Onboarding Page
 * Client onboarding workflows and checklists
 */
export default function ClientsOnboardingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="text-muted-foreground">
          Track client onboarding progress and workflows.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="rounded-full bg-muted p-4">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No clients onboarding</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When you add new clients, their onboarding checklists and progress will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
