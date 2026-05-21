"use client";

import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";
import type { MockPerson } from "@/app/_lib/demo";
import { InlineEditField } from "../inline/InlineEditField";

export function PersonDetailBannerTitle({
  person,
  onUpdatePerson,
  size = "hero",
}: {
  person: MockPerson;
  onUpdatePerson: (patch: Partial<MockPerson>) => void;
  size?: "default" | "hero";
}) {
  const isHero = size === "hero";

  return (
    <div className="flex items-center gap-4">
      <Avatar className={cn("shrink-0 ring-1 ring-border", isHero ? "size-11" : "size-9")}>
        <AvatarFallback
          className={cn(
            "font-semibold",
            isHero ? "text-sm" : "text-[10px]",
            person.avatarColor
          )}
        >
          {person.avatar}
        </AvatarFallback>
      </Avatar>
      <InlineEditField
        value={person.name}
        onSave={(name) => onUpdatePerson({ name })}
        placeholder="Name"
        displayClassName={cn(
          "block tracking-tight text-foreground",
          isHero ? "text-[32px] font-medium leading-[1.15]" : "text-2xl font-semibold"
        )}
        inputClassName={isHero ? "text-[32px] font-medium" : "text-2xl font-semibold"}
      />
    </div>
  );
}
