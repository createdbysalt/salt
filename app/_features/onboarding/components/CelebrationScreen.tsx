/**
 * CelebrationScreen Component
 *
 * A celebratory screen shown to clients after successful payment.
 * This is the "Red Carpet Moment" - the first impression after signing up.
 *
 * Features:
 * - Confetti celebration animation
 * - Welcome message with project/client name
 * - Next steps preview from onboarding checklist
 * - CTA buttons for portal access and booking kickoff call
 */

"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import {
  PartyPopper,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { CelebrationScreenProps } from "../types";

/**
 * Fire confetti burst animation
 */
function fireConfetti() {
  // Center burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"],
    disableForReducedMotion: true,
  });

  // Side bursts with delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b"],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ["#ec4899", "#8b5cf6", "#3b82f6"],
      disableForReducedMotion: true,
    });
  }, 200);
}

/**
 * CelebrationScreen - The "Red Carpet Moment" after successful payment
 *
 * Displays a celebratory welcome screen with:
 * - Confetti animation on mount
 * - Personalized welcome message
 * - Preview of next steps
 * - CTAs for portal access and booking
 */
export function CelebrationScreen({
  clientName,
  projectName,
  studioName,
  nextSteps = [],
  tableUrl,
  bookingUrl,
}: CelebrationScreenProps) {
  const hasAnimated = useRef(false);

  // Fire confetti once on mount
  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      // Small delay to ensure component is visible
      const timer = setTimeout(() => {
        fireConfetti();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Default next steps if none provided
  const displaySteps =
    nextSteps.length > 0
      ? nextSteps
      : [
          "We'll be in touch within 24 hours",
          "Complete your onboarding checklist",
          "Book your kickoff call",
        ];

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Celebration icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success to-success/60 shadow-lg animate-in zoom-in-50 duration-500">
                <PartyPopper className="h-10 w-10 text-success-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary animate-bounce">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <CardTitle className="text-3xl font-bold">
              Welcome aboard, {clientName}!
            </CardTitle>
            <CardDescription className="text-lg">
              Payment received for{" "}
              <span className="font-semibold text-foreground">{projectName}</span>
            </CardDescription>
          </div>

          {/* Studio message */}
          <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            {studioName} is excited to work with you. Let&apos;s create something amazing together.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* What's next section */}
          <div className="rounded-lg bg-muted/50 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
            <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              What happens next
            </h3>
            <ul className="space-y-2">
              {displaySteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
            {tableUrl && (
              <Button size="lg" className="w-full gap-2" asChild>
                <a href={tableUrl}>
                  Go to Spaces
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}

            {bookingUrl && (
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2"
                asChild
              >
                <a href={bookingUrl}>
                  <Calendar className="h-4 w-4" />
                  Book Kickoff Call
                </a>
              </Button>
            )}

            {!tableUrl && !bookingUrl && (
              <p className="text-center text-sm text-muted-foreground">
                We&apos;ll send you an email with next steps shortly.
              </p>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t pt-4">
            <p className="text-center text-xs text-muted-foreground">
              A confirmation email has been sent to your inbox.
              <br />
              Questions? Contact {studioName} anytime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CelebrationScreen;
