import type { WidgetProps } from "@/types/bridge-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FolderKanban, BriefcaseBusiness, Settings } from "lucide-react";

/**
 * Quick Actions Widget
 * Shows configurable action buttons
 */
export function QuickActionsWidget({ config, data }: WidgetProps) {
  const buttons = config.settings?.quickActionButtons || [];
  const enabledButtons = buttons.filter((b) => b.enabled);

  if (enabledButtons.length === 0) {
    return null;
  }

  // Icon mapping
  const iconMap = {
    "new-request": Plus,
    "knowledge-base": FolderKanban,
    projects: BriefcaseBusiness,
    settings: Settings,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {enabledButtons.map((button) => {
            const Icon = iconMap[button.id];
            return (
              <Button
                key={button.id}
                className="h-auto py-4 flex-col gap-2"
                variant="outline"
                asChild
              >
                <Link href={button.href}>
                  {Icon && <Icon className="h-5 w-5" />}
                  <span className="text-sm font-medium">{button.label}</span>
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Placeholder for future widget */}
      <div></div>
    </div>
  );
}

