"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { Checkbox } from "@repo/ui";
import { Textarea } from "@repo/ui";
import { Label } from "@repo/ui";
import { cn } from "@repo/utils";
import type { UrlStepData } from "../types";

// URL validation regex - allows http/https URLs
const URL_REGEX =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

// Character limit for goal textarea
const GOAL_MAX_LENGTH = 500;

export interface UrlStepProps {
  /** Callback when the form is submitted with valid data */
  onSubmit: (data: UrlStepData) => void;
  /** Initial values for the form (for editing) */
  initialData?: Partial<UrlStepData>;
  /** Whether the form is in a loading/submitting state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UrlStep - First step of the intake form
 *
 * Collects:
 * - Website URL (with validation)
 * - "I don't have a website" checkbox
 * - Primary goal/reason for reaching out (required)
 */
export function UrlStep({
  onSubmit,
  initialData,
  isLoading = false,
  className,
}: UrlStepProps) {
  const [websiteUrl, setWebsiteUrl] = useState(
    initialData?.website_url ?? ""
  );
  const [hasNoWebsite, setHasNoWebsite] = useState(
    initialData?.has_no_website ?? false
  );
  const [primaryGoal, setPrimaryGoal] = useState(
    initialData?.primary_goal ?? ""
  );
  const [errors, setErrors] = useState<{
    websiteUrl?: string;
    primaryGoal?: string;
  }>({});

  const validateUrl = useCallback((url: string): boolean => {
    if (!url.trim()) return false;
    return URL_REGEX.test(url);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    // Validate URL (required unless "no website" is checked)
    if (!hasNoWebsite) {
      if (!websiteUrl.trim()) {
        newErrors.websiteUrl = "Please enter your website URL";
      } else if (!validateUrl(websiteUrl)) {
        newErrors.websiteUrl =
          "Please enter a valid URL (e.g., https://example.com)";
      }
    }

    // Validate goal (always required)
    if (!primaryGoal.trim()) {
      newErrors.primaryGoal = "Please tell us about your project goals";
    } else if (primaryGoal.trim().length < 10) {
      newErrors.primaryGoal = "Please provide a bit more detail (at least 10 characters)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [hasNoWebsite, websiteUrl, primaryGoal, validateUrl]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      const data: UrlStepData = {
        website_url: hasNoWebsite ? "" : websiteUrl.trim(),
        has_no_website: hasNoWebsite,
        primary_goal: primaryGoal.trim(),
      };

      onSubmit(data);
    },
    [validateForm, hasNoWebsite, websiteUrl, primaryGoal, onSubmit]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setWebsiteUrl(e.target.value);
      // Clear URL error on change
      if (errors.websiteUrl) {
        setErrors((prev) => ({ ...prev, websiteUrl: undefined }));
      }
    },
    [errors.websiteUrl]
  );

  const handleNoWebsiteChange = useCallback((checked: boolean) => {
    setHasNoWebsite(checked);
    // Clear URL error when checking "no website"
    if (checked) {
      setErrors((prev) => ({ ...prev, websiteUrl: undefined }));
    }
  }, []);

  const handleGoalChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= GOAL_MAX_LENGTH) {
        setPrimaryGoal(value);
        // Clear goal error on change
        if (errors.primaryGoal) {
          setErrors((prev) => ({ ...prev, primaryGoal: undefined }));
        }
      }
    },
    [errors.primaryGoal]
  );

  const charactersRemaining = GOAL_MAX_LENGTH - primaryGoal.length;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6", className)}
      noValidate
    >
      {/* Website URL Field */}
      <div className="space-y-2">
        <Label htmlFor="website-url">Your Website</Label>
        <Input
          id="website-url"
          type="url"
          placeholder="https://yourwebsite.com"
          value={websiteUrl}
          onChange={handleUrlChange}
          disabled={hasNoWebsite || isLoading}
          aria-invalid={!!errors.websiteUrl}
          aria-describedby={
            errors.websiteUrl ? "website-url-error" : undefined
          }
          className={cn(
            hasNoWebsite && "opacity-50 cursor-not-allowed"
          )}
        />
        {errors.websiteUrl && (
          <p
            id="website-url-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.websiteUrl}
          </p>
        )}

        {/* No Website Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="no-website"
            checked={hasNoWebsite}
            onCheckedChange={handleNoWebsiteChange}
            disabled={isLoading}
            aria-label="I don't have a website yet"
          />
          <Label
            htmlFor="no-website"
            className="text-sm font-normal text-muted-foreground cursor-pointer"
          >
            I don&apos;t have a website yet
          </Label>
        </div>
      </div>

      {/* Primary Goal Field */}
      <div className="space-y-2">
        <Label htmlFor="primary-goal">
          What would you like help with?
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        </Label>
        <Textarea
          id="primary-goal"
          placeholder="Tell us about your project, goals, or challenges you're facing..."
          value={primaryGoal}
          onChange={handleGoalChange}
          disabled={isLoading}
          rows={4}
          aria-invalid={!!errors.primaryGoal}
          aria-describedby={
            errors.primaryGoal
              ? "primary-goal-error"
              : "primary-goal-hint"
          }
          aria-required="true"
        />
        <div className="flex items-center justify-between">
          {errors.primaryGoal ? (
            <p
              id="primary-goal-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.primaryGoal}
            </p>
          ) : (
            <p
              id="primary-goal-hint"
              className="text-sm text-muted-foreground"
            >
              Be specific about what you&apos;re looking to achieve
            </p>
          )}
          <span
            className={cn(
              "text-xs tabular-nums",
              charactersRemaining < 50
                ? "text-destructive"
                : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {charactersRemaining} characters remaining
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        loading={isLoading}
        disabled={isLoading}
      >
        Continue
      </Button>
    </form>
  );
}

export default UrlStep;
