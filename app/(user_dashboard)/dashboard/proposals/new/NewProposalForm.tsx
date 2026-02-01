"use client";

import { useState, useTransition } from "react";
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
import { Spinner } from "@/app/_components/ui/spinner";
import { AlertCircle, FileText } from "lucide-react";
import { createProposal } from "@/app/_features/proposals/actions";

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
  preselectedClientId?: string;
  preselectedTemplateId?: string;
}

export function NewProposalForm({
  clients,
  templates,
  preselectedClientId,
  preselectedTemplateId,
}: NewProposalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [templateId, setTemplateId] = useState(preselectedTemplateId || "none");

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
        template_id: templateId !== "none" ? templateId : undefined,
      });

      if (result.ok) {
        // Navigate to the new proposal's edit page
        router.push(`/dashboard/proposals/${result.data.id}`);
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
                  <Link href="/dashboard/clients/new">Create a client first</Link>
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

          {/* Template Selection */}
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/proposals")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || clients.length === 0}>
              {isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
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
