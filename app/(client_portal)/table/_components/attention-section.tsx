"use client";

import Link from "next/link";
import { Zap, CreditCard, MessageSquare, FileCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import type { BridgeActionItem } from "@/app/_lib/table/queries";

interface AttentionSectionProps {
  items: BridgeActionItem[];
}

function getIcon(type: BridgeActionItem["type"]) {
  switch (type) {
    case "invoice":
      return <CreditCard className="size-4" />;
    case "message":
      return <MessageSquare className="size-4" />;
    case "approval":
      return <FileCheck className="size-4" />;
  }
}

function getIconBgClass(urgency: BridgeActionItem["urgency"]) {
  switch (urgency) {
    case "high":
      return "bg-destructive/10 text-destructive";
    case "medium":
      return "bg-info/10 text-info";
    case "low":
      return "bg-muted text-muted-foreground";
  }
}

export function AttentionSection({ items }: AttentionSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Zap className="size-4 text-warning" />
          Needs your attention
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="font-medium">You&apos;re all caught up!</p>
              <p className="text-sm text-muted-foreground">
                Nothing needs your attention right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50 -mx-4 px-4 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${getIconBgClass(item.urgency)}`}
                >
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
