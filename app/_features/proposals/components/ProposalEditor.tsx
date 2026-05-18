"use client";

/**
 * ProposalEditor Component
 *
 * WYSIWYG-style editor for creating and editing proposals.
 * Features:
 * - Editable sections (Opportunity, Approach, Investment, Terms)
 * - PricingTable component for investment section
 * - Auto-save functionality on change
 * - Loading and error states
 */

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Button } from "@/app/_components/ui/button";
import { Separator } from "@/app/_components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/_components/ui/accordion";
import { Check, AlertCircle, GripVertical, FileText, Loader2 } from "lucide-react";
import { PricingTable } from "./PricingTable";
import { updateProposal } from "../actions";
import type {
  Proposal,
  ProposalContent,
  ProposalSection,
  ProposalTerms,
  PaymentScheduleItem,
  Currency,
} from "../types";
import { PROPOSAL_STATUS } from "../types";

// Auto-save debounce delay in milliseconds
const AUTOSAVE_DELAY = 1500;

interface ProposalEditorProps {
  proposal: Proposal;
  onSaved?: (proposal: Proposal) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ProposalEditor({ proposal, onSaved }: ProposalEditorProps) {
  // Form state
  const [title, setTitle] = useState(proposal.title);
  const [sections, setSections] = useState<ProposalSection[]>(
    proposal.content?.sections || []
  );
  const [totalAmount, setTotalAmount] = useState<number | null>(
    proposal.total_amount ?? null
  );
  const [currency, setCurrency] = useState<Currency>(proposal.currency || "USD");
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>(
    proposal.payment_schedule || []
  );
  const [terms, setTerms] = useState<ProposalTerms>(proposal.terms || {});

  // UI state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map((s) => s.id)
  );

  // Refs for debounced auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Check if proposal is editable
  const isEditable =
    proposal.status === PROPOSAL_STATUS.DRAFT ||
    proposal.status === PROPOSAL_STATUS.SENT;

  // Save function
  const saveProposal = useCallback(async () => {
    if (!hasChangesRef.current) return;

    setSaveStatus("saving");
    setErrorMessage(null);

    const content: ProposalContent = { sections };

    startTransition(async () => {
      const result = await updateProposal({
        id: proposal.id,
        title,
        content,
        total_amount: totalAmount ?? undefined,
        currency,
        payment_schedule: paymentSchedule,
        terms,
      });

      if (result.ok) {
        setSaveStatus("saved");
        hasChangesRef.current = false;
        onSaved?.(result.data);
        // Reset status after a delay
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setErrorMessage(result.message);
      }
    });
  }, [
    proposal.id,
    title,
    sections,
    totalAmount,
    currency,
    paymentSchedule,
    terms,
    onSaved,
  ]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isEditable) return;

    // Mark that we have changes
    hasChangesRef.current = true;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveProposal();
    }, AUTOSAVE_DELAY);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, sections, totalAmount, currency, paymentSchedule, terms, isEditable, saveProposal]);

  // Update section content
  const handleSectionChange = useCallback(
    (sectionId: string, content: string) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, content } : s))
      );
    },
    []
  );

  // Update section title
  const handleSectionTitleChange = useCallback(
    (sectionId: string, newTitle: string) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
      );
    },
    []
  );

  // Handle pricing table changes
  const handlePricingChange = useCallback(
    (data: {
      totalAmount: number | null;
      currency: Currency;
      paymentSchedule: PaymentScheduleItem[];
    }) => {
      setTotalAmount(data.totalAmount);
      setCurrency(data.currency);
      setPaymentSchedule(data.paymentSchedule);
    },
    []
  );

  // Handle terms changes
  const handleTermsChange = useCallback(
    (field: keyof ProposalTerms, value: string | number | undefined) => {
      setTerms((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Render save status indicator
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center gap-2 text-success text-sm">
            <Check className="size-4" />
            <span>Saved</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="size-4" />
            <span>{errorMessage || "Failed to save"}</span>
          </div>
        );
      default:
        return null;
    }
  };

  // If proposal is not editable, show read-only message
  if (!isEditable) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">This proposal cannot be edited</p>
            <p className="text-sm mt-2">
              Proposals with status "{proposal.status}" are read-only.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and save status */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proposal Details</CardTitle>
            {renderSaveStatus()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Proposal Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter proposal title..."
                className="text-lg font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No sections defined.</p>
              <p className="text-xs mt-1">
                Try creating this proposal from a template.
              </p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedSections}
              onValueChange={setExpandedSections}
              className="space-y-3"
            >
              {sections.map((section, index) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="size-4 text-muted-foreground/50" />
                      <span className="font-medium">{section.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Section {index + 1}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          Section Title
                        </label>
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            handleSectionTitleChange(section.id, e.target.value)
                          }
                          placeholder="Section title..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          Content (Markdown supported)
                        </label>
                        <Textarea
                          value={section.content}
                          onChange={(e) =>
                            handleSectionChange(section.id, e.target.value)
                          }
                          placeholder="Enter section content..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Investment / Pricing */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Investment</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingTable
            totalAmount={totalAmount}
            currency={currency}
            paymentSchedule={paymentSchedule}
            onChange={handlePricingChange}
          />
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Proposal Validity (days)
                </label>
                <Input
                  type="number"
                  value={terms.validity_days ?? ""}
                  onChange={(e) =>
                    handleTermsChange(
                      "validity_days",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="30"
                  min={1}
                />
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Payment Terms
              </label>
              <Textarea
                value={terms.payment_terms ?? ""}
                onChange={(e) => handleTermsChange("payment_terms", e.target.value)}
                placeholder="e.g., 50% deposit to begin, remaining balance due upon completion"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Cancellation Policy
              </label>
              <Textarea
                value={terms.cancellation_policy ?? ""}
                onChange={(e) =>
                  handleTermsChange("cancellation_policy", e.target.value)
                }
                placeholder="e.g., Either party may cancel with 14 days written notice..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Revision Policy
              </label>
              <Textarea
                value={terms.revision_policy ?? ""}
                onChange={(e) =>
                  handleTermsChange("revision_policy", e.target.value)
                }
                placeholder="e.g., Two rounds of design revisions included..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Ownership Clause
              </label>
              <Textarea
                value={terms.ownership_clause ?? ""}
                onChange={(e) =>
                  handleTermsChange("ownership_clause", e.target.value)
                }
                placeholder="e.g., Upon final payment, client receives full ownership..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Confidentiality Clause
              </label>
              <Textarea
                value={terms.confidentiality_clause ?? ""}
                onChange={(e) =>
                  handleTermsChange("confidentiality_clause", e.target.value)
                }
                placeholder="e.g., Both parties agree to maintain confidentiality..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Custom Terms
              </label>
              <Textarea
                value={terms.custom_terms ?? ""}
                onChange={(e) => handleTermsChange("custom_terms", e.target.value)}
                placeholder="Any additional terms specific to this project..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer with manual save button (optional) */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={saveProposal}
          disabled={isPending || saveStatus === "saving"}
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Now"
          )}
        </Button>
      </div>
    </div>
  );
}
