"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@repo/ui";
import { Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import type {
  EssentialQuestionKey,
  IntakeQuestion,
  IntakeQuestionResponses,
} from "../types";

// =============================================================================
// QUESTION DEFINITIONS
// =============================================================================

/**
 * The 5 Essential Questions for client intake
 * These questions help understand the client's situation, goals, and decision-making process
 */
const ESSENTIAL_QUESTIONS: IntakeQuestion[] = [
  {
    id: "q-trigger",
    key: "trigger",
    question: "What prompted you to reach out now?",
    placeholder:
      "Something must have happened that made you take action today. What was it?",
    hint: "Understanding the trigger helps us address your most urgent needs first.",
    order: 1,
  },
  {
    id: "q-desired-future",
    key: "desired_future",
    question: "If we worked together, what does success look like for you?",
    placeholder:
      "Describe your ideal outcome. What will be different 6 months from now?",
    hint: "Paint a picture of your desired future state - be as specific as possible.",
    order: 2,
  },
  {
    id: "q-obstacles",
    key: "obstacles",
    question: "What's been stopping you from achieving this already?",
    placeholder:
      "What obstacles, challenges, or limitations have gotten in the way?",
    hint: "Understanding your blockers helps us create a realistic path forward.",
    order: 3,
  },
  {
    id: "q-decision-process",
    key: "decision_process",
    question: "Who else is involved in making this decision?",
    placeholder:
      "Are there other stakeholders, partners, or team members we should consider?",
    hint: "This helps us tailor our proposal to address everyone's concerns.",
    order: 4,
  },
  {
    id: "q-anti-goal",
    key: "anti_goal",
    question: "What outcome would you absolutely want to avoid?",
    placeholder:
      "What would make this project a failure? What's your worst-case scenario?",
    hint: "Knowing what to avoid is just as important as knowing what you want.",
    order: 5,
  },
];

// Character limit for responses
const RESPONSE_MAX_LENGTH = 1000;
const RESPONSE_MIN_LENGTH = 20;

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export interface QuestionsFlowProps {
  /** Callback when all questions are answered */
  onComplete: (responses: IntakeQuestionResponses) => void;
  /** Callback when user wants to go back to previous step */
  onBack?: () => void;
  /** Initial responses for editing/resuming */
  initialResponses?: Partial<IntakeQuestionResponses>;
  /** Whether the form is in a loading/submitting state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type ResponsesState = {
  [K in EssentialQuestionKey]: string;
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * QuestionsFlow - Conversational intake questions
 *
 * Shows one question at a time in a conversational style.
 * Progress indicator shows current position.
 * Users can navigate back and forth between questions.
 */
export function QuestionsFlow({
  onComplete,
  onBack,
  initialResponses,
  isLoading = false,
  className,
}: QuestionsFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<ResponsesState>({
    trigger: initialResponses?.trigger_response ?? "",
    desired_future: initialResponses?.desired_future_response ?? "",
    obstacles: initialResponses?.obstacles_response ?? "",
    decision_process: initialResponses?.decision_process_response ?? "",
    anti_goal: initialResponses?.anti_goal_response ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = ESSENTIAL_QUESTIONS[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === ESSENTIAL_QUESTIONS.length - 1;
  const totalQuestions = ESSENTIAL_QUESTIONS.length;

  const currentResponse = responses[currentQuestion.key];
  const charactersRemaining = RESPONSE_MAX_LENGTH - currentResponse.length;

  const validateCurrentResponse = useCallback((): boolean => {
    const trimmedResponse = currentResponse.trim();

    if (!trimmedResponse) {
      setError("Please provide a response to continue");
      return false;
    }

    if (trimmedResponse.length < RESPONSE_MIN_LENGTH) {
      setError(
        `Please provide a bit more detail (at least ${RESPONSE_MIN_LENGTH} characters)`
      );
      return false;
    }

    setError(null);
    return true;
  }, [currentResponse]);

  const handleResponseChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= RESPONSE_MAX_LENGTH) {
        setResponses((prev) => ({
          ...prev,
          [currentQuestion.key]: value,
        }));
        // Clear error on change
        if (error) {
          setError(null);
        }
      }
    },
    [currentQuestion.key, error]
  );

  const handleNext = useCallback(() => {
    if (!validateCurrentResponse()) {
      return;
    }

    if (isLastQuestion) {
      // All questions answered - submit
      const finalResponses: IntakeQuestionResponses = {
        trigger_response: responses.trigger.trim(),
        desired_future_response: responses.desired_future.trim(),
        obstacles_response: responses.obstacles.trim(),
        decision_process_response: responses.decision_process.trim(),
        anti_goal_response: responses.anti_goal.trim(),
      };
      onComplete(finalResponses);
    } else {
      // Move to next question
      setCurrentIndex((prev) => prev + 1);
      setError(null);
    }
  }, [validateCurrentResponse, isLastQuestion, responses, onComplete]);

  const handlePrevious = useCallback(() => {
    if (isFirstQuestion) {
      // Go back to previous step (URL step)
      onBack?.();
    } else {
      // Go to previous question
      setCurrentIndex((prev) => prev - 1);
      setError(null);
    }
  }, [isFirstQuestion, onBack]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow Cmd/Ctrl + Enter to proceed
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    },
    [handleNext]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-muted-foreground">
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% complete
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out rounded-full"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          />
        </div>
        {/* Step Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {ESSENTIAL_QUESTIONS.map((q, index) => (
            <div
              key={q.id}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index < currentIndex && "bg-primary",
                index === currentIndex && "bg-primary w-4",
                index > currentIndex && "bg-muted-foreground/30"
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {currentQuestion.question}
          </h2>
          {currentQuestion.hint && (
            <p className="text-sm text-muted-foreground">
              {currentQuestion.hint}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            id={`response-${currentQuestion.key}`}
            placeholder={currentQuestion.placeholder}
            value={currentResponse}
            onChange={handleResponseChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={6}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `response-${currentQuestion.key}-error`
                : `response-${currentQuestion.key}-hint`
            }
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            {error ? (
              <p
                id={`response-${currentQuestion.key}-error`}
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : (
              <p
                id={`response-${currentQuestion.key}-hint`}
                className="text-sm text-muted-foreground"
              >
                Press ⌘+Enter to continue
              </p>
            )}
            <span
              className={cn(
                "text-xs tabular-nums",
                charactersRemaining < 100
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {charactersRemaining} characters remaining
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isLoading}
          className="flex-1"
        >
          {isFirstQuestion ? "Back" : "Previous"}
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          loading={isLoading && isLastQuestion}
          disabled={isLoading}
          className="flex-1"
        >
          {isLastQuestion ? "Complete" : "Next"}
        </Button>
      </div>
    </div>
  );
}

export default QuestionsFlow;
