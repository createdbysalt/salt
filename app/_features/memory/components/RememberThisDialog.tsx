"use client";

/**
 * The corrections door (Phase M5): after a dismissal, "Want me to remember
 * this?" opens here with a pre-drafted line. On confirm the shared
 * corrections classifier routes it — a concrete exclusion becomes an
 * always-on intake block (Sources), a generalization becomes a Memory
 * customization — and the toast links to where it landed.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@repo/ui";
import { rememberCorrection } from "../customize/correction-actions";

export function RememberThisDialog({
  draft,
  open,
  onOpenChange,
}: {
  /** Pre-drafted line from the dismissed card; the user edits freely. */
  draft: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(draft);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setValue(draft);
  }, [open, draft]);

  const submit = async () => {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    const result = await rememberCorrection({ text, source: "correction" });
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onOpenChange(false);
    toast.success(result.message, {
      action: {
        label: "See where it landed",
        onClick: () => router.push(result.href),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Want me to remember this?</DialogTitle>
          <DialogDescription>
            Tell me what to do differently next time. If it&apos;s something
            I can always enforce, I will — otherwise I&apos;ll keep it in
            mind when I read new things.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. Never let in anything from @spammy.com"
            aria-label="What should I remember?"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={busy || !value.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Remember"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
