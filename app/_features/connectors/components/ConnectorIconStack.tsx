"use client";

import { cn } from "@repo/utils";
import { ConnectorIcon } from "./connector-icons";
import { connectorsForToolkits } from "../utils/toolkit-connector";

const SIZE = {
  sm: { shell: "size-6", icon: 12 },
  md: { shell: "size-7", icon: 14 },
} as const;

interface ConnectorIconStackProps {
  toolkits: readonly string[];
  max?: number;
  size?: keyof typeof SIZE;
  className?: string;
}

export function ConnectorIconStack({
  toolkits,
  max = 4,
  size = "sm",
  className,
}: ConnectorIconStackProps) {
  const connectors = connectorsForToolkits(toolkits).slice(0, max);
  if (connectors.length === 0) return null;

  const dimensions = SIZE[size];

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {connectors.map((connector) => (
        <span
          key={connector.id}
          title={connector.label}
          className={cn(
            dimensions.shell,
            "inline-flex items-center justify-center rounded-full bg-card border border-border/60 shadow-sm ring-2 ring-card",
          )}
        >
          <ConnectorIcon id={connector.id} size={dimensions.icon} />
        </span>
      ))}
    </div>
  );
}
