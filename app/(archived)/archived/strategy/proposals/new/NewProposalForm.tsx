"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Badge } from "@/app/_components/ui/badge";
import { AlertCircle, FileText, Sparkles, Wand2, Loader2 } from "lucide-react";
import { createProposal } from "@/app/_features/proposals/actions";
import { ClientContextPanel } from "@/app/_features/proposals/components/ClientContextPanel";
import type { ClientProposalContext } from "@/app/_features/intelligence/generators/proposal-generator";

interface Client {
  id: string;
  name: string;
  contact_email: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

interface NewProposalFormProps {
  clients: Client[];
  templates: Template[];
  clientsWithIntakes?: string[];
  preselectedClientId?: string;
  preselectedTemplateId?: string;
}

export function NewProposalForm({
  clients,
  templates,
  clientsWithIntakes = [],
  preselectedClientId,
  preselectedTemplateId,
}: NewProposalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [templateId, setTemplateId] = useState(preselectedTemplateId || "none");
  const [useIntelligence, setUseIntelligence] = useState(false);
  const [clientContext, setClientContext] = useState<ClientProposalContext | null>(null);

  // Check if selected client has intake data
  const selectedClientHasIntake = useMemo(() => {
    return clientId && clientsWithIntakes.includes(clientId);
  }, [clientId, clientsWithIntakes]);

  // Handle client context loaded
  const handleContextLoaded = useCallback(
    (context: ClientProposalContext | null) => {
      setClientContext(context);
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Please select a client");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a proposal title");
      return;
    }

    startTransition(async () => {
      const result = await createProposal({
        client_id: clientId,
        title: title.trim(),
        template_id: useIntelligence ? undefined : (templateId !== "none" ? templateId : undefined),
        fromIntelligence: useIntelligence,
      });

      if (result.ok) {
        // Navigate to the new proposal's edit page
        router.push(`/strategy/proposals/${result.data.id}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            {clients.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                <p>No clients found.</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link href="/studio/clients/new">Create a client first</Link>
                </Button>
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        {client.contact_email && (
                          <span className="text-xs text-muted-foreground">
                            {client.contact_email}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Client Intelligence Context */}
          {clientId && (
            <ClientContextPanel
              clientId={clientId}
              onContextLoaded={handleContextLoaded}
            />
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Website Redesign Proposal"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              A descriptive title for this proposal
            </p>
          </div>

          {/* AI Intelligence Option - Only show if client has intake */}
          {selectedClientHasIntake && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Content Generation</Label>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Available
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseIntelligence(true)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    useIntelligence
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  disabled={isPending}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className={`h-4 w-4 ${useIntelligence ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-medium ${useIntelligence ? "text-primary" : ""}`}>
                      Generate from Intelligence
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI extracts problems, goals, and quotes from intake responses
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setUseIntelligence(false)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    !useIntelligence
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  disabled={isPending}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={`h-4 w-4 ${!useIntelligence ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-medium ${!useIntelligence ? "text-primary" : ""}`}>
                      Start from Template
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a pre-built template or start with a blank proposal
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Template Selection - Only show if not using intelligence */}
          {!useIntelligence && (
          <div className="space-y-2">
            <Label htmlFor="template">Start from Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Blank Proposal</span>
                  </div>
                </SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span>{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a template to pre-populate sections and terms
            </p>
          </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/strategy/proposals")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || clients.length === 0}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Proposal"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
