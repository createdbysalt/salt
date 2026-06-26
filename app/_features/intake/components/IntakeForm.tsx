"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@repo/utils";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui";
import { UrlStep } from "./UrlStep";
import { QuestionsFlow } from "./QuestionsFlow";
import { BrandSnapshot } from "./BrandSnapshot";
import { submitIntake, createIntake, getIntakeById, updateIntakeQuestions } from "../actions";
import type {
  IntakeStep,
  IntakeFormState,
  UrlStepData,
  IntakeQuestionResponses,
  IntakeSubmission,
  DiscoveryData,
  DiscoveryStatus,
  BrandSnapshot as BrandSnapshotType,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface IntakeFormProps {
  /** Studio ID to associate the intake with */
  workspaceId: string;
  /** Studio name for display purposes */
  workspaceName?: string;
  /** Optional referral source for tracking */
  referralSource?: string;
  /** Optional UTM parameters */
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// THANK YOU COMPONENT
// =============================================================================

interface ThankYouProps {
  workspaceName?: string;
  onStartNew?: () => void;
}

function ThankYou({ workspaceName, onStartNew }: ThankYouProps) {
  return (
    <Card className="text-center">
      <CardHeader className="pb-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl">Thank you!</CardTitle>
        <CardDescription className="text-base mt-2">
          Your submission has been received
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {workspaceName ? (
            <>
              The team at <strong>{workspaceName}</strong> will review your project details
              and reach out to you soon.
            </>
          ) : (
            <>
              We&apos;ll review your project details and reach out to you soon.
            </>
          )}
        </p>
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">What happens next?</p>
          <ul className="space-y-1 text-left list-disc list-inside">
            <li>We&apos;ll review your brand snapshot and project goals</li>
            <li>You&apos;ll receive a personalized response within 1-2 business days</li>
            <li>If it&apos;s a good fit, we&apos;ll schedule a discovery call</li>
          </ul>
        </div>
        {onStartNew && (
          <Button variant="outline" onClick={onStartNew} className="mt-4">
            Submit another project
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DISCOVERY POLLING
// =============================================================================

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 20; // 1 minute max

function useDiscoveryPolling(
  intakeId: string | null,
  enabled: boolean
): { discoveryData: DiscoveryData | null; discoveryStatus: DiscoveryStatus; brandSnapshot: BrandSnapshotType | null } {
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData | null>(null);
  const [discoveryStatus, setDiscoveryStatus] = useState<DiscoveryStatus>("pending");
  const [brandSnapshot, setBrandSnapshot] = useState<BrandSnapshotType | null>(null);

  useEffect(() => {
    if (!intakeId || !enabled) return;

    // Capture the non-null value for the async function
    const currentIntakeId = intakeId;

    let pollCount = 0;
    let pollTimeout: NodeJS.Timeout;

    async function poll() {
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        setDiscoveryStatus("partial");
        return;
      }

      try {
        const result = await getIntakeById(currentIntakeId);
        if (result.success && result.data) {
          const intake = result.data;

          // Update discovery data
          if (intake.auto_discovery) {
            setDiscoveryData(intake.auto_discovery);
          }

          // Update brand snapshot
          if (intake.brand_snapshot) {
            setBrandSnapshot(intake.brand_snapshot);
          }

          // Update status
          setDiscoveryStatus(intake.discovery_status);

          // Stop polling if complete or failed
          if (
            intake.discovery_status === "completed" ||
            intake.discovery_status === "failed" ||
            intake.discovery_status === "partial"
          ) {
            return;
          }
        }
      } catch (error) {
        console.error("Error polling discovery status:", error);
      }

      // Continue polling
      pollCount++;
      pollTimeout = setTimeout(poll, POLL_INTERVAL);
    }

    poll();

    return () => {
      clearTimeout(pollTimeout);
    };
  }, [intakeId, enabled]);

  return { discoveryData, discoveryStatus, brandSnapshot };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * IntakeForm - Main orchestrating component for the intake flow
 *
 * Orchestrates the complete intake experience:
 * 1. UrlStep - Collect website URL and primary goal
 * 2. QuestionsFlow - Answer the 5 essential questions (discovery runs in background)
 * 3. BrandSnapshot - Display discovered brand information
 * 4. ThankYou - Confirmation and next steps
 */
export function IntakeForm({
  workspaceId,
  workspaceName,
  referralSource,
  utmParams,
  className,
}: IntakeFormProps) {
  // Form state
  const [step, setStep] = useState<IntakeStep>("url");
  const [urlData, setUrlData] = useState<UrlStepData | null>(null);
  const [questionResponses, setQuestionResponses] = useState<IntakeQuestionResponses | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<IntakeSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll for discovery data while user is answering questions
  const shouldPollDiscovery = step === "questions" || step === "snapshot";
  const { discoveryData, discoveryStatus, brandSnapshot } = useDiscoveryPolling(
    intakeId,
    shouldPollDiscovery && !urlData?.has_no_website
  );

  // ==========================================================================
  // STEP HANDLERS
  // ==========================================================================

  /**
   * Handle URL step completion
   * Creates a draft intake and starts discovery in background
   */
  const handleUrlSubmit = useCallback(
    async (data: UrlStepData) => {
      setError(null);
      setIsSubmitting(true);

      try {
        // Create draft intake to start discovery immediately
        const result = await createIntake({
          workspace_id: workspaceId,
          website_url: data.website_url,
          has_no_website: data.has_no_website,
          primary_goal: data.primary_goal,
        });

        if (!result.success) {
          setError(result.error);
          setIsSubmitting(false);
          return;
        }

        // Store intake ID and URL data
        setIntakeId(result.data.id);
        setUrlData(data);

        // Move to questions step
        setStep("questions");
      } catch (err) {
        console.error("Error in URL step:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [workspaceId]
  );

  /**
   * Handle questions completion
   * Updates the intake with question responses and finalizes submission
   */
  const handleQuestionsComplete = useCallback(
    async (responses: IntakeQuestionResponses) => {
      if (!intakeId) {
        setError("Something went wrong. Please refresh and try again.");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        // Update intake with question responses
        const result = await updateIntakeQuestions({
          intake_id: intakeId,
          trigger_response: responses.trigger_response,
          desired_future_response: responses.desired_future_response,
          obstacles_response: responses.obstacles_response,
          decision_process_response: responses.decision_process_response,
          anti_goal_response: responses.anti_goal_response,
        });

        if (!result.success) {
          setError(result.error);
          setIsSubmitting(false);
          return;
        }

        // Store question responses and submission
        setQuestionResponses(responses);
        setSubmission(result.data);

        // Move to snapshot step
        setStep("snapshot");
      } catch (err) {
        console.error("Error submitting questions:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [intakeId]
  );

  /**
   * Handle going back from questions to URL step
   */
  const handleQuestionsBack = useCallback(() => {
    setStep("url");
  }, []);

  /**
   * Handle snapshot acknowledgment - move to thank you
   */
  const handleSnapshotContinue = useCallback(() => {
    setStep("complete");
  }, []);

  /**
   * Reset form for new submission
   */
  const handleStartNew = useCallback(() => {
    setStep("url");
    setUrlData(null);
    setQuestionResponses(null);
    setIntakeId(null);
    setSubmission(null);
    setError(null);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={cn("space-y-6", className)}>
      {/* Error display */}
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Step: URL */}
      {step === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>Let&apos;s get started</CardTitle>
            <CardDescription>
              Tell us about your project and we&apos;ll create a personalized brand snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlStep
              onSubmit={handleUrlSubmit}
              initialData={urlData ?? undefined}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Step: Questions */}
      {step === "questions" && (
        <Card>
          <CardHeader>
            <CardTitle>A few quick questions</CardTitle>
            <CardDescription>
              Help us understand your needs so we can serve you better.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionsFlow
              onComplete={handleQuestionsComplete}
              onBack={handleQuestionsBack}
              initialResponses={
                questionResponses
                  ? {
                      trigger_response: questionResponses.trigger_response,
                      desired_future_response: questionResponses.desired_future_response,
                      obstacles_response: questionResponses.obstacles_response,
                      decision_process_response: questionResponses.decision_process_response,
                      anti_goal_response: questionResponses.anti_goal_response,
                    }
                  : undefined
              }
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Step: Snapshot */}
      {step === "snapshot" && (
        <div className="space-y-6">
          <BrandSnapshot
            brandSnapshot={brandSnapshot ?? submission?.brand_snapshot}
            discoveryData={discoveryData ?? submission?.auto_discovery}
            discoveryStatus={
              urlData?.has_no_website
                ? "completed"
                : discoveryStatus
            }
            isLoading={false}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Your information has been submitted successfully.
                  {discoveryStatus === "processing" || discoveryStatus === "pending"
                    ? " We're still analyzing your brand - this will complete in the background."
                    : ""}
                </p>
                <Button
                  onClick={handleSnapshotContinue}
                  className="w-full"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <ThankYou workspaceName={workspaceName} onStartNew={handleStartNew} />
      )}
    </div>
  );
}

export default IntakeForm;
