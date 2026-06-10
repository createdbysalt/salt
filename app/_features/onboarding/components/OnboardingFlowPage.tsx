"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Role } from "../data/onboarding-flow-data";
import { OnboardingShell } from "./OnboardingShell";
import { StepAbout } from "./StepAbout";
import { StepConnect } from "./StepConnect";
import { StepDrafting } from "./StepDrafting";
import { StepMemory } from "./StepMemory";
import { StepWelcome } from "./StepWelcome";

const TOTAL_STEPS = 5;

export function OnboardingFlowPage() {
  const [step, setStep] = useState(0);
  const [, setName] = useState("");
  const [, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState<string[]>([]);

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <OnboardingShell step={step} totalSteps={TOTAL_STEPS} showSkip={step >= 1 && step <= 3}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <div key="s0">
            <StepWelcome onNext={() => setStep(1)} />
          </div>
        )}
        {step === 1 && (
          <div key="s1">
            <StepAbout
              onBack={back}
              onNext={(data) => {
                setName(data.name);
                setRole(data.role);
                setStep(2);
              }}
            />
          </div>
        )}
        {step === 2 && (
          <div key="s2">
            <StepConnect
              initial={connected}
              onBack={back}
              onNext={(ids) => {
                setConnected(ids);
                setStep(3);
              }}
            />
          </div>
        )}
        {step === 3 && (
          <div key="s3">
            <StepMemory onBack={back} onNext={() => setStep(4)} />
          </div>
        )}
        {step === 4 && (
          <div key="s4">
            <StepDrafting />
          </div>
        )}
      </AnimatePresence>
    </OnboardingShell>
  );
}
