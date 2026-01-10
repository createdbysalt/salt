"use client";

import { TrendingUp, Search, FileText, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const actions = [
    {
      icon: TrendingUp,
      label: "Check performance",
      disabled: true,
    },
    {
      icon: Search,
      label: "Scan competitor",
      disabled: true,
    },
    {
      icon: FileText,
      label: "Generate report",
      disabled: true,
    },
    {
      icon: Plus,
      label: "New project",
      href: "/dashboard/projects/new",
      disabled: false,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={action.disabled}
              asChild={!action.disabled && !!action.href}
            >
              {!action.disabled && action.href ? (
                <a href={action.href}>
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </a>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                  {action.disabled && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      🚧
                    </span>
                  )}
                </>
              )}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
