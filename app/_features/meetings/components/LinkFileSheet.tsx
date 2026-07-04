"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Figma,
  Github,
  Link2,
  Loader2,
  Video,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { addMeetingSource } from "../actions";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import type { SourceProvider } from "../actions/schemas";

type LinkFileSheetProps = {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FILE_PROVIDERS: Array<{
  value: SourceProvider;
  label: string;
  icon: React.ElementType;
  placeholder: string;
}> = [
  {
    value: "google-drive",
    label: "Google Drive",
    icon: FileText,
    placeholder: "https://docs.google.com/...",
  },
  {
    value: "figma",
    label: "Figma",
    icon: Figma,
    placeholder: "https://figma.com/file/...",
  },
  {
    value: "notion",
    label: "Notion",
    icon: FileText,
    placeholder: "https://notion.so/...",
  },
  {
    value: "loom",
    label: "Loom",
    icon: Video,
    placeholder: "https://loom.com/share/...",
  },
  {
    value: "miro",
    label: "Miro",
    icon: FileText,
    placeholder: "https://miro.com/app/board/...",
  },
  {
    value: "linear",
    label: "Linear",
    icon: FileText,
    placeholder: "https://linear.app/...",
  },
  {
    value: "github",
    label: "GitHub",
    icon: Github,
    placeholder: "https://github.com/...",
  },
  {
    value: "slack",
    label: "Slack",
    icon: FileText,
    placeholder: "https://slack.com/archives/...",
  },
  {
    value: "dropbox",
    label: "Dropbox",
    icon: FileText,
    placeholder: "https://dropbox.com/...",
  },
  {
    value: "other",
    label: "Other URL",
    icon: ExternalLink,
    placeholder: "https://...",
  },
];

function detectProvider(url: string): SourceProvider {
  // Match on the parsed hostname, not a substring — "evil.com/figma.com"
  // or "figma.com.evil.com" must not classify as a trusted provider.
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);

  if (isHost("docs.google.com") || isHost("drive.google.com")) return "google-drive";
  if (isHost("figma.com")) return "figma";
  if (isHost("notion.so") || isHost("notion.site")) return "notion";
  if (isHost("loom.com")) return "loom";
  if (isHost("miro.com")) return "miro";
  if (isHost("linear.app")) return "linear";
  if (isHost("github.com")) return "github";
  if (isHost("slack.com")) return "slack";
  if (isHost("dropbox.com")) return "dropbox";
  return "other";
}

export function LinkFileSheet({ meetingId, open, onOpenChange }: LinkFileSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [provider, setProvider] = useState<SourceProvider>("google-drive");
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedProvider = FILE_PROVIDERS.find((p) => p.value === provider);

  function handleUrlChange(value: string) {
    setUrl(value);
    if (value.startsWith("http")) {
      const detected = detectProvider(value);
      if (detected !== provider) {
        setProvider(detected);
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    const trimmedUrl = url.trim();
    if (!safeHttpUrl(trimmedUrl)) {
      setError("Please enter a valid http or https URL");
      return;
    }

    startTransition(async () => {
      const result = await addMeetingSource({
        meetingId,
        provider,
        kind: "linked_file",
        sourceUrl: trimmedUrl,
        displayName: displayName.trim() || undefined,
      });

      if (result.ok) {
        setUrl("");
        setDisplayName("");
        setProvider("google-drive");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="size-5" strokeWidth={2} />
            Link a File
          </SheetTitle>
          <SheetDescription>
            Connect a related document, design file, or recording to this meeting.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="link-file-provider">File Type</Label>
            <Select value={provider} onValueChange={(v: string) => setProvider(v as SourceProvider)}>
              <SelectTrigger id="link-file-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <p.icon className="size-4" />
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-file-url">URL</Label>
            <Input
              id="link-file-url"
              type="url"
              placeholder={selectedProvider?.placeholder ?? "https://..."}
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-file-name">
              Display Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="link-file-name"
              type="text"
              placeholder="e.g., Project brief, Meeting recording"
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !url.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link File"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
