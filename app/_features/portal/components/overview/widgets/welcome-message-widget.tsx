import type { WidgetProps } from "@/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";

/**
 * Welcome Message Widget
 * Displays a customizable greeting message with auto-greeting
 */
export function WelcomeMessageWidget({ config, data }: WidgetProps) {
  const customText = config.settings?.welcomeText;

  // Get time-based greeting
  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }

  const greeting = getGreeting();
  const displayName = data.firstName || data.clientName;

  return (
    <section className="pt-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {greeting}, {displayName}!
        </h1>
        {customText ? (
          <p className="text-lg text-muted-foreground sm:text-xl">
            {customText}
          </p>
        ) : (
          <p className="text-lg text-muted-foreground sm:text-xl">
            Welcome back. Here's what's happening with your projects.
          </p>
        )}
      </div>
    </section>
  );
}

