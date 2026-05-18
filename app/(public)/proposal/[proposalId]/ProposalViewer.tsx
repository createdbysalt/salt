"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Separator } from "@/app/_components/ui/separator";
import type { ProposalWithClient, PaymentScheduleItem, SignProposalInput } from "@/app/_features/proposals/types";
import { SignatureCapture } from "@/app/_features/proposals/components/SignatureCapture";
import { signProposal } from "@/app/_features/proposals/actions";

interface ProposalViewerProps {
  proposal: ProposalWithClient;
  isExpired: boolean;
  isSigned: boolean;
  isDeclined: boolean;
}

export function ProposalViewer({
  proposal,
  isExpired,
  isSigned,
  isDeclined,
}: ProposalViewerProps) {
  const router = useRouter();

  // Handle signature submission using signProposal server action
  const handleSign = useCallback(async (input: SignProposalInput): Promise<{ ok: boolean; message?: string }> => {
    const result = await signProposal(input);
    return {
      ok: result.ok,
      message: result.ok ? undefined : result.message,
    };
  }, []);

  // Handle successful signature
  const handleSignSuccess = useCallback(() => {
    // Refresh the page to show the signed state
    router.refresh();
  }, [router]);
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate validity
  const expiresAt = useMemo(() => {
    if (proposal.expires_at) {
      return formatDate(proposal.expires_at);
    }
    if (proposal.terms?.validity_days && proposal.sent_at) {
      const sentDate = new Date(proposal.sent_at);
      sentDate.setDate(sentDate.getDate() + proposal.terms.validity_days);
      return formatDate(sentDate.toISOString());
    }
    return null;
  }, [proposal]);

  return (
    <main className="min-h-screen bg-background">
      {/* Status Banner */}
      {isExpired && (
        <div className="bg-destructive/10 border-b border-destructive/20 py-4">
          <div className="max-w-4xl mx-auto px-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive font-medium">
              This proposal has expired and can no longer be signed.
            </p>
          </div>
        </div>
      )}

      {isSigned && (
        <div className="bg-success/10 border-b border-success/20 py-4">
          <div className="max-w-4xl mx-auto px-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-success font-medium">
              This proposal was accepted on {formatDate(proposal.accepted_at)}.
            </p>
          </div>
        </div>
      )}

      {isDeclined && (
        <div className="bg-muted border-b py-4">
          <div className="max-w-4xl mx-auto px-6 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">
              This proposal was declined on {formatDate(proposal.declined_at)}.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {proposal.title}
              </h1>
              <p className="text-muted-foreground">
                Prepared for{" "}
                <span className="text-foreground font-medium">
                  {proposal.client.company_name || proposal.client.name}
                </span>
              </p>
            </div>
            <div className="text-right space-y-1">
              {proposal.total_amount != null && (
                <p className="text-2xl font-bold">
                  {formatCurrency(proposal.total_amount, proposal.currency)}
                </p>
              )}
              {expiresAt && !isExpired && !isSigned && !isDeclined && (
                <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="h-4 w-4" />
                  Valid until {expiresAt}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Sections */}
        {proposal.content?.sections?.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdownToHtml(section.content),
                }}
              />
            </CardContent>
          </Card>
        ))}

        {/* Investment / Pricing */}
        {(proposal.total_amount != null ||
          (proposal.payment_schedule && proposal.payment_schedule.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>Investment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.total_amount != null && (
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Total Project Value</span>
                  <span className="font-bold">
                    {formatCurrency(proposal.total_amount, proposal.currency)}
                  </span>
                </div>
              )}

              {proposal.payment_schedule && proposal.payment_schedule.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-muted-foreground">
                      Payment Schedule
                    </h4>
                    <div className="space-y-2">
                      {proposal.payment_schedule.map(
                        (payment: PaymentScheduleItem, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center py-2 border-b last:border-0"
                          >
                            <div>
                              <p className="font-medium">{payment.description}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {formatDate(payment.due_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(payment.amount, proposal.currency)}
                              </p>
                              <Badge
                                variant={
                                  payment.status === "paid"
                                    ? "default"
                                    : payment.status === "overdue"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {proposal.terms && Object.keys(proposal.terms).some((k) => proposal.terms?.[k as keyof typeof proposal.terms]) && (
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.terms.payment_terms && (
                <div>
                  <h4 className="font-medium mb-1">Payment Terms</h4>
                  <p className="text-muted-foreground text-sm">
                    {proposal.terms.payment_terms}
                  </p>
                </div>
              )}

              {proposal.terms.revision_policy && (
                <div>
                  <h4 className="font-medium mb-1">Revision Policy</h4>
                  <p className="text-muted-foreground text-sm">
                    {proposal.terms.revision_policy}
                  </p>
                </div>
              )}

              {proposal.terms.cancellation_policy && (
                <div>
                  <h4 className="font-medium mb-1">Cancellation Policy</h4>
                  <p className="text-muted-foreground text-sm">
                    {proposal.terms.cancellation_policy}
                  </p>
                </div>
              )}

              {proposal.terms.ownership_clause && (
                <div>
                  <h4 className="font-medium mb-1">Ownership & Rights</h4>
                  <p className="text-muted-foreground text-sm">
                    {proposal.terms.ownership_clause}
                  </p>
                </div>
              )}

              {proposal.terms.confidentiality_clause && (
                <div>
                  <h4 className="font-medium mb-1">Confidentiality</h4>
                  <p className="text-muted-foreground text-sm">
                    {proposal.terms.confidentiality_clause}
                  </p>
                </div>
              )}

              {proposal.terms.custom_terms && (
                <div>
                  <h4 className="font-medium mb-1">Additional Terms</h4>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {proposal.terms.custom_terms}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        {!isExpired && !isSigned && !isDeclined && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Accept This Proposal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                By signing below, you agree to the terms and conditions outlined
                in this proposal.
              </p>
              <SignatureCapture
                proposalId={proposal.id}
                recipientEmail={proposal.client.email}
                onSign={handleSign}
                onSuccess={handleSignSuccess}
              />
            </CardContent>
          </Card>
        )}

        {/* Signed Confirmation */}
        {isSigned && proposal.signature_name && (
          <Card className="border-success/20 bg-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Proposal Accepted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="text-muted-foreground">Signed by:</span>{" "}
                <span className="font-medium">{proposal.signature_name}</span>
              </p>
              {proposal.accepted_at && (
                <p>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(proposal.accepted_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
              )}
              {proposal.document_hash && (
                <p className="text-xs text-muted-foreground font-mono">
                  Document Hash: {proposal.document_hash.substring(0, 16)}...
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>This proposal was generated electronically and is legally binding once signed.</p>
        </div>
      </footer>
    </main>
  );
}

/**
 * Simple markdown to HTML converter for proposal content.
 * Handles basic formatting: bold, italic, links, lists, headings.
 */
function formatMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, "<h4 class=\"font-medium mt-4 mb-2\">$1</h4>")
    .replace(/^## (.+)$/gm, "<h3 class=\"font-semibold mt-4 mb-2\">$1</h3>")
    .replace(/^# (.+)$/gm, "<h2 class=\"font-bold mt-4 mb-2\">$1</h2>")
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" class=\"text-primary underline\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>")
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Paragraphs (split by double newlines)
    .split(/\n\n+/)
    .map((para) => {
      // Check if paragraph contains only list items
      if (para.includes("<li>")) {
        return `<ul class="list-disc list-inside my-2">${para}</ul>`;
      }
      return `<p class="my-2">${para}</p>`;
    })
    .join("");

  // Clean up any orphaned list items
  html = html.replace(/<p class="my-2">(<li>.*<\/li>)<\/p>/g, "<ul class=\"list-disc list-inside my-2\">$1</ul>");

  return html;
}
