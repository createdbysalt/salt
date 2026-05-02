"use client";

import Link from "next/link";
import {
  FileText,
  ImageIcon,
  FileCode,
  File,
  MessageSquare,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import type { BridgeActivityItem } from "@/app/_lib/table/queries";

interface ActivitySectionProps {
  items: BridgeActivityItem[];
}

function getFileIcon(mimeType: string | undefined) {
  if (!mimeType) return <File className="size-4" />;

  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="size-4" />;
  }
  if (mimeType.includes("pdf")) {
    return <FileText className="size-4" />;
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json")
  ) {
    return <FileCode className="size-4" />;
  }
  return <FileText className="size-4" />;
}

function getActivityIcon(item: BridgeActivityItem) {
  switch (item.type) {
    case "file":
      return getFileIcon(item.metadata?.mimeType);
    case "message":
      return <MessageSquare className="size-4" />;
    case "milestone":
      return <CheckCircle2 className="size-4" />;
    case "invoice":
      return <Receipt className="size-4" />;
  }
}

function getIconBgClass(type: BridgeActivityItem["type"]) {
  switch (type) {
    case "file":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "message":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    case "milestone":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "invoice":
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
  }
}

export function ActivitySection({ items }: ActivitySectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {items.slice(0, 6).map((item) => {
            const initials = item.actorName
              ? item.actorName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "?";

            return (
              <Link
                key={item.id}
                href={item.url}
                className="flex items-start gap-3 rounded-lg py-2 px-2 -mx-2 transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${getIconBgClass(item.type)}`}
                >
                  {getActivityIcon(item)}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.actorName && (
                      <>
                        <Avatar className="size-4">
                          <AvatarImage src={item.actorAvatarUrl || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{item.actorName}</span>
                        <span>&middot;</span>
                      </>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {item.projectName && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {item.projectName}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {items.length > 6 && (
          <div className="mt-3 pt-3 border-t">
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link href="/table/inbox">View all activity</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
