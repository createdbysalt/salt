"use client";

import { Check, CheckCheck, Eye } from "lucide-react";
import { cn } from "@repo/utils";

export type DeliveryStatusType = "sending" | "sent" | "delivered" | "read" | "failed";

interface DeliveryStatusProps {
  status: DeliveryStatusType;
  className?: string;
}

export function DeliveryStatus({ status, className }: DeliveryStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        status === "failed" ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {status === "sending" && (
        <>
          <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
          Sending
        </>
      )}
      {status === "sent" && (
        <>
          <Check className="size-3" />
          Sent
        </>
      )}
      {status === "delivered" && (
        <>
          <CheckCheck className="size-3" />
          Delivered
        </>
      )}
      {status === "read" && (
        <>
          <Eye className="size-3" />
          Read
        </>
      )}
      {status === "failed" && (
        <>
          <span className="size-1.5 rounded-full bg-destructive" />
          Failed
        </>
      )}
    </span>
  );
}
