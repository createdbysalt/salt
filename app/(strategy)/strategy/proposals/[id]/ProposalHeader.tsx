"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { Spinner } from "@/app/_components/ui/spinner";
import {
  FileText,
  Send,
  Eye,
  Check,
  X,
  Clock,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { deleteProposal } from "@/app/_features/proposals/actions";
import type { ProposalWithClient, ProposalStatus } from "@/app/_features/proposals/types";
import { PROPOSAL_STATUS } from "@/app/_features/proposals/types";
import { format } from "date-fns";

interface ProposalHeaderProps {
  proposal: ProposalWithClient;
}

// Status badge configuration
const statusConfig: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  sent: { label: "Sent", variant: "default", icon: <Send className="h-3 w-3" /> },
  viewed: { label: "Viewed", variant: "outline", icon: <Eye className="h-3 w-3" /> },
  accepted: { label: "Accepted", variant: "default", icon: <Check className="h-3 w-3" /> },
  declined: { label: "Declined", variant: "destructive", icon: <X className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
};

export function ProposalHeader({ proposal }: ProposalHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = statusConfig[proposal.status];
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/proposal/${proposal.public_id}`;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProposal(proposal.id);
      if (result.ok) {
        router.push("/strategy/proposals");
      }
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Title and Client */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{proposal.title}</h1>
            <Badge variant={config.variant} className="gap-1">
              {config.icon}
              {config.label}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <span>Client: </span>
            <span className="font-medium text-foreground">{proposal.client.name}</span>
            {proposal.client.email && (
              <span className="ml-2">({proposal.client.email})</span>
            )}
          </div>
          {proposal.total_amount != null && (
            <div className="text-lg font-semibold">
              {formatCurrency(proposal.total_amount, proposal.currency)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Link (for sent proposals) */}
          {proposal.status !== PROPOSAL_STATUS.DRAFT && (
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          )}

          {/* View Public (for sent proposals) */}
          {proposal.status !== PROPOSAL_STATUS.DRAFT && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </a>
            </Button>
          )}

          {/* Delete (only drafts) */}
          {proposal.status === PROPOSAL_STATUS.DRAFT && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{proposal.title}&quot;? This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Spinner className="h-4 w-4 mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Created:</span>{" "}
          {format(new Date(proposal.created_at), "MMM d, yyyy")}
        </div>
        {proposal.sent_at && (
          <div>
            <span className="font-medium">Sent:</span>{" "}
            {format(new Date(proposal.sent_at), "MMM d, yyyy")}
          </div>
        )}
        {proposal.viewed_at && (
          <div>
            <span className="font-medium">Viewed:</span>{" "}
            {format(new Date(proposal.viewed_at), "MMM d, yyyy")}
          </div>
        )}
        {proposal.accepted_at && (
          <div className="text-success">
            <span className="font-medium">Accepted:</span>{" "}
            {format(new Date(proposal.accepted_at), "MMM d, yyyy")}
          </div>
        )}
        {proposal.declined_at && (
          <div className="text-destructive">
            <span className="font-medium">Declined:</span>{" "}
            {format(new Date(proposal.declined_at), "MMM d, yyyy")}
          </div>
        )}
      </div>
    </div>
  );
}
