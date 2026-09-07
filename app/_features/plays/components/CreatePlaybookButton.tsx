"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import {
  browseConnectedToolkitAction,
  type BrowseToolkitResult,
} from "@/app/_features/plays/playbooks/actions/browse-toolkit";
import type { ToolkitBrowserToolkit } from "@/app/_features/plays/playbooks/toolkit-browser";

type CreatePlaybookButtonProps = {
  className?: string;
};

type BrowserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; toolkits: ToolkitBrowserToolkit[] }
  | { status: "error"; message: string };

export function CreatePlaybookButton({ className }: CreatePlaybookButtonProps) {
  const [open, setOpen] = useState(false);
  const [browser, setBrowser] = useState<BrowserState>({ status: "idle" });

  useEffect(() => {
    if (!open || browser.status !== "idle") return;
    setBrowser({ status: "loading" });
    void browseConnectedToolkitAction().then((result: BrowseToolkitResult) => {
      setBrowser(
        result.ok
          ? { status: "ready", toolkits: result.toolkits }
          : { status: "error", message: result.message },
      );
    });
  }, [open, browser.status]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "h-9 shrink-0 rounded-full border-border/60 bg-card px-3.5 gap-1.5 text-sm font-medium text-foreground shadow-none hover:border-border hover:bg-muted/40",
          className
        )}
      >
        <Plus className="size-3.5" strokeWidth={2.25} />
        Create playbook
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create playbook</DialogTitle>
            <DialogDescription>
              Custom playbooks are coming. Everything Salt can do starts from
              what your connected apps allow — browse your live toolkit below.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-muted/50 p-4 flex items-start gap-3">
            <Sparkles className="size-5 text-violet shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">AI-assisted creation</p>
              <p className="text-xs text-muted-foreground">
                Soon you&apos;ll describe the outcome and Salt drafts the
                playbook from these exact actions.
              </p>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Your connected toolkit
            </p>

            {browser.status === "loading" || browser.status === "idle" ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : browser.status === "error" ? (
              <p className="text-sm text-muted-foreground">{browser.message}</p>
            ) : browser.toolkits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No apps connected yet. Connect an app to see what Salt can do
                  with it.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href="/sources">Connect an app</a>
                </Button>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto pr-1">
                <Accordion type="multiple" className="w-full">
                  {browser.toolkits.map((toolkit) => (
                    <AccordionItem
                      key={toolkit.toolkitSlug}
                      value={toolkit.toolkitSlug}
                    >
                      <AccordionTrigger className="py-2.5">
                        <span className="flex items-center gap-2.5">
                          {toolkit.catalogId && (
                            <ConnectorIcon
                              id={toolkit.catalogId as ConnectorCatalogId}
                              size={18}
                            />
                          )}
                          <span className="text-sm font-medium">
                            {toolkit.label}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {toolkit.tools.length}{" "}
                            {toolkit.tools.length === 1 ? "action" : "actions"}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2.5 pb-2">
                          {toolkit.tools.map((tool) => (
                            <li
                              key={tool.slug}
                              className="rounded-lg bg-muted/40 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {tool.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-wide"
                                >
                                  {tool.risk}
                                </Badge>
                              </div>
                              {tool.summary && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {tool.summary}
                                </p>
                              )}
                              {tool.inputSchema && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {Object.entries(tool.inputSchema).map(
                                    ([arg, field]) => (
                                      <code
                                        key={arg}
                                        className={cn(
                                          "rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50",
                                          field.required &&
                                            "border-border text-foreground",
                                        )}
                                        title={`${arg}: ${field.type}${field.required ? " (required)" : ""}`}
                                      >
                                        {arg}
                                        {field.required ? "*" : ""}
                                      </code>
                                    ),
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
