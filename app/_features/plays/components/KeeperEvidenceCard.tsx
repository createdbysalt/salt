"use client";

import Link from "next/link";
import { BookMarked, ArrowRight, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";

type EntityType = "person" | "organization" | "work" | "meeting" | "file" | "billing";

type KeeperEvidenceCardProps = {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  learningsCount: number;
};

function getEntityLabel(entityType: EntityType): string {
  switch (entityType) {
    case "person":
      return "this person";
    case "organization":
      return "this organization";
    case "work":
      return "this work";
    case "meeting":
      return "this meeting";
    case "file":
      return "this file";
    case "billing":
      return "this billing record";
    default:
      return "this record";
  }
}

export function KeeperEvidenceCard({
  entityType,
  entityId,
  entityName,
  learningsCount,
}: KeeperEvidenceCardProps) {
  const keeperUrl = `/plays/players/keeper?tab=learned&entity=${entityType}&entityId=${entityId}`;

  if (learningsCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BookMarked className="size-4 text-muted-foreground" />
            Keeper Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            No automatic updates yet for {getEntityLabel(entityType)}. When Keeper learns
            something, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:border-foreground/20 transition-colors">
      <Link href={keeperUrl} className="block">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <BookMarked className="size-4 text-foreground" />
              Keeper Evidence
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {learningsCount} update{learningsCount !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Keeper has made {learningsCount} automatic update{learningsCount !== 1 ? "s" : ""} to{" "}
            {entityName} based on accumulated evidence.
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Brain className="size-3" />
              View all evidence
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
