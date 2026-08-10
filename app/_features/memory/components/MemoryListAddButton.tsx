"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BillingDirection } from "@/app/_features/billing/data";
import {
  createBlankBillingRecordAction,
  createBlankFileAction,
  createBlankMeetingAction,
  createBlankOrgAction,
  createBlankPersonAction,
  createBlankWorkAction,
} from "../actions/create-blank-record";
import { MemoryAddButton } from "./MemoryAddButton";

export type MemoryListAddKind =
  | "person"
  | "org"
  | "work"
  | "meeting"
  | "resource"
  | { kind: "billing"; direction: BillingDirection };

type MemoryListAddButtonProps = {
  label: string;
  kind: MemoryListAddKind;
};

async function runCreateAction(kind: MemoryListAddKind) {
  switch (kind) {
    case "person":
      return createBlankPersonAction();
    case "org":
      return createBlankOrgAction();
    case "work":
      return createBlankWorkAction();
    case "meeting":
      return createBlankMeetingAction();
    case "resource":
      return createBlankFileAction();
    default:
      return createBlankBillingRecordAction(kind.direction);
  }
}

export function MemoryListAddButton({ label, kind }: MemoryListAddButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <MemoryAddButton
      label={label}
      pending={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await runCreateAction(kind);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }

          router.push(result.data.href);
          router.refresh();
        });
      }}
    />
  );
}
