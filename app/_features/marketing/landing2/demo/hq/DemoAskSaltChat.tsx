"use client";

import type { ReactNode } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SiGmail, SiStripe } from "react-icons/si";
import type { DemoChatSnapshot } from "../useWorkspaceDemoTimeline";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Props = {
  chat: DemoChatSnapshot;
};

export function AskSaltDemoChat({ chat }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {chat.messageSent && chat.userMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: APPLE_EASE }}
          className="flex justify-end"
        >
          <div className="max-w-[92%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">
            {chat.userMessage}
          </div>
        </motion.div>
      )}

      {chat.showOnIt && (
        <SaltRow>
          <SaltBubble>
            <p className="text-[13px] leading-relaxed text-foreground">On it.</p>
          </SaltBubble>
        </SaltRow>
      )}

      {chat.showIntegrationSteps && (
        <SaltRow spacer>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
            className="max-w-[92%]"
          >
            <SaltBubble className="space-y-1.5">
              <IntegrationStep
                icon={SiStripe}
                iconClassName="text-[#635BFF]"
                label="Stripe"
                detail="Updating add-on quote to $3,875"
                status={chat.stripe}
              />
              <IntegrationStep
                icon={SiGmail}
                iconClassName="text-[#EA4335]"
                label="Gmail"
                detail="Revising Cedar reply draft"
                status={chat.gmail}
              />
            </SaltBubble>
          </motion.div>
        </SaltRow>
      )}

      {chat.showReadyToSend && (
        <SaltRow spacer>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
            className="max-w-[92%]"
          >
            <SaltBubble className="space-y-2.5">
              <p className="text-[13px] leading-relaxed text-foreground">Ready to send.</p>
              <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/90">
                {chat.revisedDraft}
              </div>
            </SaltBubble>
          </motion.div>
        </SaltRow>
      )}

      {chat.sendItSent && chat.sendItMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: APPLE_EASE }}
          className="flex justify-end"
        >
          <div className="max-w-[92%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">
            {chat.sendItMessage}
          </div>
        </motion.div>
      )}

      {chat.showSent && (
        <SaltRow spacer>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
            className="max-w-[92%]"
          >
            <SaltBubble>
              <p className="text-[13px] leading-relaxed text-foreground">
                Sent to Ari in Gmail.
              </p>
            </SaltBubble>
          </motion.div>
        </SaltRow>
      )}

      {chat.showMemoryNote && (
        <SaltRow spacer>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
            className="max-w-[92%]"
          >
            <SaltBubble>
              <p className="text-[13px] leading-relaxed text-foreground">
                Saved the 15-day timeline to Memory for Cedar scope work. I'll suggest 15 days
                on the next add-on.
              </p>
            </SaltBubble>
          </motion.div>
        </SaltRow>
      )}
    </div>
  );
}

function SaltRow({
  children,
  spacer,
}: {
  children: ReactNode;
  spacer?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: APPLE_EASE }}
      className="flex items-start gap-2.5"
    >
      {spacer ? (
        <span className="size-7 shrink-0" aria-hidden />
      ) : (
        <span className="size-7 shrink-0 rounded-full surface-aurora grid place-items-center">
          <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  );
}

function SaltBubble({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 ${className}`}
    >
      {children}
    </div>
  );
}

function IntegrationStep({
  icon: Icon,
  iconClassName,
  label,
  detail,
  status,
}: {
  icon: typeof SiStripe;
  iconClassName: string;
  label: string;
  detail: string;
  status: DemoChatSnapshot["stripe"];
}) {
  const isDone = status === "done";
  const isActive = status === "active";
  const isPending = status === "pending";

  if (isPending) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
        isDone
          ? "border-border/45 bg-background/50"
          : "border-sky/25 bg-sky/8"
      }`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-card ring-1 ring-border/50">
        <Icon className={`size-3 ${iconClassName}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-tight">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{detail}</p>
      </div>
      <span className="shrink-0 text-muted-foreground">
        {isDone ? (
          <Check className="size-3.5 text-[oklch(0.62_0.16_145)]" strokeWidth={2.5} />
        ) : isActive ? (
          <Loader2 className="size-3.5 animate-spin text-sky" strokeWidth={2.25} />
        ) : null}
      </span>
    </div>
  );
}
