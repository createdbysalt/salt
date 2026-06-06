"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  DEMO_CURSOR_HOTSPOT,
  DEMO_TAP_HOTSPOT,
  type CursorPosition,
} from "./landing2-demo-cursor";

export type { CursorPosition };

export const DEMO_EDIT_TEXT =
  "Change the price to $3,875 and the timeline to 15 days.";

export const DEMO_REVISED_DRAFT =
  "Hi Ari, two extra landing pages would be a separate engagement. I've updated the add-on to $3,875 with a 15-day timeline. The revised invoice is already attached.";

export const DEMO_SEND_IT_TEXT = "Send it";

export type DemoVariant = "desktop" | "mobile";

export const MOBILE_CANVAS_W = 390;
export const MOBILE_CANVAS_H = 844;
/** Scroll distance to bring the first play card into view on the mobile canvas. */
export const MOBILE_SCROLL_MAX = 300;

export type DemoPhase =
  | "idle"
  | "scrollToPlays"
  | "moveToApprove"
  | "clickApprove"
  | "celebrate"
  | "moveToApprove2"
  | "clickApprove2"
  | "celebrate2"
  | "moveToEdit"
  | "clickEdit"
  | "panelOpen"
  | "typing"
  | "hold"
  | "moveToSend"
  | "clickSend"
  | "saltReply"
  | "stripeConnect"
  | "gmailConnect"
  | "readyToSend"
  | "typingSendIt"
  | "holdSendIt"
  | "moveToSendReply"
  | "clickSendReply"
  | "sentConfirmation"
  | "complete"
  | "reset";

export type DemoCursorTargets = {
  billingApprove: CursorPosition | null;
  middleApprove: CursorPosition | null;
  scopeEdit: CursorPosition | null;
  send: CursorPosition | null;
};

export type IntegrationStepStatus = "pending" | "active" | "done";

export type DemoChatSnapshot = {
  messageSent: boolean;
  userMessage: string;
  showOnIt: boolean;
  showIntegrationSteps: boolean;
  stripe: IntegrationStepStatus;
  gmail: IntegrationStepStatus;
  showReadyToSend: boolean;
  revisedDraft: string;
  sendItSent: boolean;
  sendItMessage: string;
  showSent: boolean;
  showMemoryNote: boolean;
};

/** Pause after user message before Salt's first reply. */
const ON_IT_DELAY_MS = 420;
/** Hold "On it." alone before integration steps appear. */
const INTEGRATION_STEPS_DELAY_MS = 520;
/** Pause after Gmail completes before "Ready to send." */
const READY_TO_SEND_DELAY_MS = 580;
/** Pause after second send before "Sent to Ari." */
const SENT_DELAY_MS = 380;
/** Gap between "Sent" and the Memory follow-up. */
const MEMORY_NOTE_DELAY_MS = 1350;

const DESKTOP_CURSOR_START: CursorPosition = { x: 640, y: 580 };
/** Touch dot top-left after scroll — center near first play card. */
const MOBILE_TAP_START: CursorPosition = { x: 175, y: 480 };
const MOBILE_SWIPE_START: CursorPosition = { x: 175, y: 320 };
const MOBILE_SWIPE_END: CursorPosition = { x: 175, y: 480 };
const MOBILE_COMPOSER_TAP: CursorPosition = { x: 56, y: 664 };
const DESKTOP_FALLBACK_BILLING_APPROVE: CursorPosition = { x: 1050, y: 640 };
const DESKTOP_FALLBACK_MIDDLE_APPROVE: CursorPosition = { x: 1050, y: 700 };
const DESKTOP_FALLBACK_SCOPE_EDIT: CursorPosition = { x: 980, y: 760 };
const DESKTOP_FALLBACK_SEND: CursorPosition = { x: 1545, y: 838 };
const MOBILE_FALLBACK_BILLING_APPROVE: CursorPosition = { x: 272, y: 538 };
const MOBILE_FALLBACK_MIDDLE_APPROVE: CursorPosition = { x: 272, y: 618 };
const MOBILE_FALLBACK_SCOPE_EDIT: CursorPosition = { x: 130, y: 678 };
const MOBILE_FALLBACK_SEND: CursorPosition = { x: 302, y: 770 };
const CURSOR_HOTSPOT = DEMO_CURSOR_HOTSPOT;
const TAP_HOTSPOT = DEMO_TAP_HOTSPOT;

const DESKTOP_TIMELINE: { phase: DemoPhase; duration: number }[] = [
  { phase: "idle", duration: 900 },
  { phase: "moveToApprove", duration: 1000 },
  { phase: "clickApprove", duration: 350 },
  { phase: "celebrate", duration: 1200 },
  { phase: "moveToApprove2", duration: 1000 },
  { phase: "clickApprove2", duration: 350 },
  { phase: "celebrate2", duration: 1200 },
  { phase: "moveToEdit", duration: 1000 },
  { phase: "clickEdit", duration: 350 },
  { phase: "panelOpen", duration: 550 },
  { phase: "typing", duration: 3400 },
  { phase: "hold", duration: 700 },
  { phase: "moveToSend", duration: 750 },
  { phase: "clickSend", duration: 350 },
  { phase: "saltReply", duration: 1400 },
  { phase: "stripeConnect", duration: 1750 },
  { phase: "gmailConnect", duration: 1750 },
  { phase: "readyToSend", duration: 1200 },
  { phase: "typingSendIt", duration: 850 },
  { phase: "holdSendIt", duration: 450 },
  { phase: "moveToSendReply", duration: 750 },
  { phase: "clickSendReply", duration: 350 },
  { phase: "sentConfirmation", duration: 4200 },
  { phase: "complete", duration: 2200 },
  { phase: "reset", duration: 850 },
];

const MOBILE_TIMELINE: { phase: DemoPhase; duration: number }[] = [
  { phase: "idle", duration: 1400 },
  { phase: "scrollToPlays", duration: 1400 },
  ...DESKTOP_TIMELINE.slice(1),
];

function timelineFor(variant: DemoVariant) {
  return variant === "mobile" ? MOBILE_TIMELINE : DESKTOP_TIMELINE;
}

function phaseOrderFor(variant: DemoVariant) {
  return timelineFor(variant).map((step) => step.phase);
}

function isAtOrAfterPhase(
  current: DemoPhase,
  target: DemoPhase,
  phaseOrder: DemoPhase[],
) {
  return phaseOrder.indexOf(current) >= phaseOrder.indexOf(target);
}

function isChatPersistPhase(phase: DemoPhase) {
  return phase !== "idle" && phase !== "reset";
}

const TYPING_MS = DESKTOP_TIMELINE.find((s) => s.phase === "typing")!.duration;
const SEND_IT_TYPING_MS = DESKTOP_TIMELINE.find((s) => s.phase === "typingSendIt")!.duration;
const MS_PER_CHAR = Math.floor(TYPING_MS / DEMO_EDIT_TEXT.length);
const MS_PER_CHAR_SEND_IT = Math.floor(SEND_IT_TYPING_MS / DEMO_SEND_IT_TEXT.length);

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function composerCursorPos(
  sendTarget: CursorPosition,
  variant: DemoVariant = "desktop",
): CursorPosition {
  if (variant === "mobile") {
    return MOBILE_COMPOSER_TAP;
  }
  return {
    x: sendTarget.x - 95,
    y: sendTarget.y - 68,
  };
}

/** Billing card exit finishes ~350ms into celebrate; drift starts after layout settles. */
const CELEBRATE_DRIFT_START_MS = 520;
/** Celebrate eases partway toward the next target; the following move phase finishes. */
const APPROVE_TRANSITION_DRIFT = 0.36;

type FrozenCursorTargets = {
  billingApprove: CursorPosition;
  middleApprove: CursorPosition;
  scopeEdit: CursorPosition;
  send: CursorPosition;
};

function mergeTargetsOnPhaseEnter(
  phase: DemoPhase,
  live: DemoCursorTargets,
  frozen: FrozenCursorTargets,
) {
  if (live.billingApprove && (phase === "moveToApprove" || phase === "clickApprove")) {
    frozen.billingApprove = live.billingApprove;
  }
  if (live.middleApprove && (phase === "moveToApprove2" || phase === "clickApprove2")) {
    frozen.middleApprove = live.middleApprove;
  }
  if (live.scopeEdit && (phase === "clickEdit" || phase === "panelOpen")) {
    frozen.scopeEdit = live.scopeEdit;
  }
  if (
    live.send &&
    [
      "typing",
      "hold",
      "moveToSend",
      "clickSend",
      "moveToSendReply",
      "clickSendReply",
      "typingSendIt",
      "holdSendIt",
    ].includes(phase)
  ) {
    frozen.send = live.send;
  }
}

function lerpCursor(
  from: CursorPosition,
  to: CursorPosition,
  progress: number,
  ease: (t: number) => number = easeInOutCubic,
): CursorPosition {
  const eased = ease(Math.min(1, Math.max(0, progress)));
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
  };
}

function transitionProgress(
  phase: DemoPhase,
  phaseElapsed: number,
  phaseDuration: number,
  celebratePhase: DemoPhase,
  movePhase: DemoPhase,
  afterPhase: DemoPhase,
  phaseOrder: DemoPhase[],
): number {
  if (phase === celebratePhase) {
    if (phaseElapsed < CELEBRATE_DRIFT_START_MS) return 0;
    const t =
      (phaseElapsed - CELEBRATE_DRIFT_START_MS) /
      (phaseDuration - CELEBRATE_DRIFT_START_MS);
    return APPROVE_TRANSITION_DRIFT * easeInOutCubic(t);
  }
  if (phase === movePhase) {
    const t = phaseElapsed / phaseDuration;
    return (
      APPROVE_TRANSITION_DRIFT +
      (1 - APPROVE_TRANSITION_DRIFT) * easeInOutCubic(t)
    );
  }
  if (isAtOrAfterPhase(phase, afterPhase, phaseOrder)) return 1;
  return 0;
}

function getApprovedPlayIds(phase: DemoPhase, phaseOrder: DemoPhase[]): string[] {
  if (!isChatPersistPhase(phase)) return [];
  const ids: string[] = [];
  if (isAtOrAfterPhase(phase, "celebrate", phaseOrder)) ids.push("1");
  if (isAtOrAfterPhase(phase, "celebrate2", phaseOrder)) ids.push("2");
  return ids;
}

function phaseAt(
  elapsed: number,
  timeline: { phase: DemoPhase; duration: number }[],
): {
  phase: DemoPhase;
  phaseElapsed: number;
  phaseDuration: number;
} {
  let acc = 0;
  for (const step of timeline) {
    if (elapsed < acc + step.duration) {
      return { phase: step.phase, phaseElapsed: elapsed - acc, phaseDuration: step.duration };
    }
    acc += step.duration;
  }
  const last = timeline[timeline.length - 1]!;
  return { phase: last.phase, phaseElapsed: last.duration, phaseDuration: last.duration };
}

function getScrollOffset(
  variant: DemoVariant,
  phase: DemoPhase,
  phaseElapsed: number,
  phaseDuration: number,
  phaseOrder: DemoPhase[],
): number {
  if (variant !== "mobile") return 0;
  if (phase === "idle") return 0;
  if (phase === "scrollToPlays") {
    return MOBILE_SCROLL_MAX * easeInOutCubic(phaseElapsed / phaseDuration);
  }
  if (phase === "reset") {
    return MOBILE_SCROLL_MAX * (1 - easeInOutCubic(phaseElapsed / phaseDuration));
  }
  if (isAtOrAfterPhase(phase, "moveToApprove", phaseOrder)) {
    return MOBILE_SCROLL_MAX;
  }
  return 0;
}

const PANEL_PHASES: DemoPhase[] = [
  "panelOpen",
  "typing",
  "hold",
  "moveToSend",
  "clickSend",
  "saltReply",
  "stripeConnect",
  "gmailConnect",
  "readyToSend",
  "typingSendIt",
  "holdSendIt",
  "moveToSendReply",
  "clickSendReply",
  "sentConfirmation",
  "complete",
];

function isMessageSent(phase: DemoPhase, phaseElapsed: number) {
  return (
    (phase === "clickSend" && phaseElapsed > 150) ||
    [
      "saltReply",
      "stripeConnect",
      "gmailConnect",
      "readyToSend",
      "typingSendIt",
      "holdSendIt",
      "moveToSendReply",
      "clickSendReply",
      "sentConfirmation",
      "complete",
    ].includes(phase)
  );
}

function isSendItSent(phase: DemoPhase, phaseElapsed: number) {
  return (
    (phase === "clickSendReply" && phaseElapsed > 150) ||
    ["sentConfirmation", "complete"].includes(phase)
  );
}

function buildDemoChat(
  phase: DemoPhase,
  phaseElapsed: number,
  phaseOrder: DemoPhase[],
): DemoChatSnapshot {
  const messageSent = isMessageSent(phase, phaseElapsed);
  const persistChat = isChatPersistPhase(phase);

  const showOnIt =
    persistChat &&
    isAtOrAfterPhase(phase, "saltReply", phaseOrder) &&
    (phase !== "saltReply" || phaseElapsed >= ON_IT_DELAY_MS);

  const showIntegrationSteps =
    persistChat &&
    ((phase === "stripeConnect" && phaseElapsed >= INTEGRATION_STEPS_DELAY_MS) ||
      isAtOrAfterPhase(phase, "gmailConnect", phaseOrder));

  let stripe: IntegrationStepStatus = "pending";
  let gmail: IntegrationStepStatus = "pending";

  if (phase === "stripeConnect" && showIntegrationSteps) {
    stripe = "active";
  } else if (
    showIntegrationSteps &&
    isAtOrAfterPhase(phase, "gmailConnect", phaseOrder)
  ) {
    stripe = "done";
  }

  if (phase === "gmailConnect" && showIntegrationSteps) {
    gmail = "active";
  } else if (
    showIntegrationSteps &&
    isAtOrAfterPhase(phase, "readyToSend", phaseOrder)
  ) {
    gmail = "done";
  }

  const showReadyToSend =
    persistChat &&
    isAtOrAfterPhase(phase, "readyToSend", phaseOrder) &&
    (phase !== "readyToSend" || phaseElapsed >= READY_TO_SEND_DELAY_MS);

  const sendItSent = isSendItSent(phase, phaseElapsed);

  const showSent =
    persistChat &&
    ((phase === "sentConfirmation" && phaseElapsed >= SENT_DELAY_MS) ||
      phase === "complete");

  const showMemoryNote =
    persistChat &&
    ((phase === "sentConfirmation" && phaseElapsed >= MEMORY_NOTE_DELAY_MS) ||
      phase === "complete");

  return {
    messageSent,
    userMessage: DEMO_EDIT_TEXT,
    showOnIt,
    showIntegrationSteps,
    stripe,
    gmail,
    showReadyToSend,
    revisedDraft: DEMO_REVISED_DRAFT,
    sendItSent,
    sendItMessage: DEMO_SEND_IT_TEXT,
    showSent,
    showMemoryNote,
  };
}

export function useWorkspaceDemoTimeline(
  getTargets: () => DemoCursorTargets,
  options?: { enabled?: boolean; variant?: DemoVariant },
) {
  const enabled = options?.enabled ?? true;
  const variant = options?.variant ?? "desktop";
  const timeline = timelineFor(variant);
  const phaseOrder = phaseOrderFor(variant);
  const totalMs = timeline.reduce((sum, step) => sum + step.duration, 0);
  const cursorStart =
    variant === "mobile" ? MOBILE_TAP_START : DESKTOP_CURSOR_START;
  const interactionHotspot =
    variant === "mobile" ? TAP_HOTSPOT : CURSOR_HOTSPOT;
  const fallbackBilling =
    variant === "mobile"
      ? MOBILE_FALLBACK_BILLING_APPROVE
      : DESKTOP_FALLBACK_BILLING_APPROVE;
  const fallbackMiddle =
    variant === "mobile"
      ? MOBILE_FALLBACK_MIDDLE_APPROVE
      : DESKTOP_FALLBACK_MIDDLE_APPROVE;
  const fallbackScope =
    variant === "mobile" ? MOBILE_FALLBACK_SCOPE_EDIT : DESKTOP_FALLBACK_SCOPE_EDIT;
  const fallbackSend =
    variant === "mobile" ? MOBILE_FALLBACK_SEND : DESKTOP_FALLBACK_SEND;

  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);
  const confettiIdRef = useRef(0);
  const prevPhaseRef = useRef<DemoPhase>("idle");
  const frozenTargetsRef = useRef<FrozenCursorTargets>({
    billingApprove: fallbackBilling,
    middleApprove: fallbackMiddle,
    scopeEdit: fallbackScope,
    send: fallbackSend,
  });
  const phaseSnapshotRef = useRef<DemoPhase>("idle");
  const celebrateEditCapturedRef = useRef(false);
  const panelComposerRef = useRef<CursorPosition>(
    composerCursorPos(fallbackSend, variant),
  );

  useEffect(() => {
    if (reduceMotion || !enabled) return;
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const elapsed = (now - start) % totalMs;
      setTick(elapsed);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, enabled, totalMs]);

  if (reduceMotion) {
    return {
      phase: "complete" as DemoPhase,
      approvedPlayIds: ["1", "2"],
      burstPlayId: null as string | null,
      confettiBurst: null as { id: number; origin: CursorPosition } | null,
      askOpen: true,
      scopeEditPressed: false,
      sendPressed: false,
      cursorPos: null as CursorPosition | null,
      typedText: "",
      composerText: "",
      demoChat: buildDemoChat("complete", 0, phaseOrder),
      cursorVisible: false,
      cursorOpacity: 0,
      buttonPressed: false,
      scrollOffset: variant === "mobile" ? MOBILE_SCROLL_MAX : 0,
      tapSwiping: false,
    };
  }

  if (!enabled) {
    return {
      phase: "idle" as DemoPhase,
      approvedPlayIds: [] as string[],
      burstPlayId: null as string | null,
      confettiBurst: null as { id: number; origin: CursorPosition } | null,
      askOpen: false,
      scopeEditPressed: false,
      sendPressed: false,
      cursorPos: cursorStart,
      typedText: "",
      composerText: "",
      demoChat: buildDemoChat("idle", 0, phaseOrder),
      cursorVisible: false,
      cursorOpacity: 0,
      buttonPressed: false,
      scrollOffset: 0,
      tapSwiping: false,
    };
  }

  const { phase, phaseElapsed, phaseDuration } = phaseAt(tick, timeline);
  const scrollOffset = getScrollOffset(
    variant,
    phase,
    phaseElapsed,
    phaseDuration,
    phaseOrder,
  );

  if (
    (phase === "clickApprove" && prevPhaseRef.current !== "clickApprove") ||
    (phase === "clickApprove2" && prevPhaseRef.current !== "clickApprove2")
  ) {
    confettiIdRef.current += 1;
  }
  prevPhaseRef.current = phase;

  if (phaseSnapshotRef.current !== phase) {
    phaseSnapshotRef.current = phase;
    if (phase === "moveToApprove" || phase === "idle") {
      celebrateEditCapturedRef.current = false;
    }
    mergeTargetsOnPhaseEnter(phase, getTargets(), frozenTargetsRef.current);
    if (phase === "panelOpen") {
      panelComposerRef.current = composerCursorPos(
        frozenTargetsRef.current.send,
        variant,
      );
    }
  }

  if (
    phase === "celebrate2" &&
    phaseElapsed >= CELEBRATE_DRIFT_START_MS &&
    !celebrateEditCapturedRef.current
  ) {
    const liveEdit = getTargets().scopeEdit;
    if (liveEdit) {
      frozenTargetsRef.current.scopeEdit = liveEdit;
      celebrateEditCapturedRef.current = true;
    }
  }

  const billingApproveTarget = frozenTargetsRef.current.billingApprove;
  const middleApproveTarget = frozenTargetsRef.current.middleApprove;
  const scopeEditTarget = frozenTargetsRef.current.scopeEdit;
  const sendTarget = frozenTargetsRef.current.send;

  const approvedPlayIds = getApprovedPlayIds(phase, phaseOrder);
  const burstPlayId =
    phase === "clickApprove" ? "1" : phase === "clickApprove2" ? "2" : null;
  const askOpen = PANEL_PHASES.includes(phase);
  const scopeEditPressed =
    phase === "clickEdit" || (phase === "panelOpen" && phaseElapsed < 150);
  const sendPressed =
    (phase === "clickSend" || phase === "clickSendReply") && phaseElapsed < 280;

  const showConfetti =
    phase === "clickApprove" ||
    phase === "celebrate" ||
    phase === "clickApprove2" ||
    phase === "celebrate2";
  const confettiOrigin =
    phase === "clickApprove2" || phase === "celebrate2"
      ? middleApproveTarget
      : billingApproveTarget;
  const confettiBurst = showConfetti
    ? {
        id: confettiIdRef.current,
        origin: {
          x: confettiOrigin.x + interactionHotspot.x,
          y: confettiOrigin.y + interactionHotspot.y,
        },
      }
    : null;

  const composerRest =
    phase === "panelOpen"
      ? panelComposerRef.current
      : composerCursorPos(sendTarget, variant);
  let cursorPos: CursorPosition = cursorStart;
  let cursorVisible = phase !== "idle";
  let cursorOpacity = 1;
  let buttonPressed = false;
  let tapSwiping = variant === "mobile" && phase === "scrollToPlays";

  switch (phase) {
    case "idle":
      cursorVisible = false;
      cursorOpacity = 0;
      cursorPos = cursorStart;
      break;
    case "scrollToPlays":
      if (variant === "mobile") {
        cursorVisible = true;
        cursorOpacity = Math.min(1, phaseElapsed / 220);
        const swipeT = easeInOutCubic(phaseElapsed / phaseDuration);
        cursorPos = lerpCursor(MOBILE_SWIPE_START, MOBILE_SWIPE_END, swipeT);
      } else {
        cursorVisible = false;
        cursorOpacity = 0;
        cursorPos = cursorStart;
        tapSwiping = false;
      }
      break;
    case "reset": {
      cursorVisible = true;
      const fadeStart = phaseDuration - 280;
      cursorOpacity =
        phaseElapsed >= fadeStart
          ? Math.max(0, 1 - (phaseElapsed - fadeStart) / 280)
          : 1;
      cursorPos = lerpCursor(
        composerCursorPos(sendTarget),
        cursorStart,
        phaseElapsed / phaseDuration,
      );
      break;
    }
    case "moveToApprove":
      cursorOpacity = Math.min(1, phaseElapsed / 220);
      cursorPos = lerpCursor(
        cursorStart,
        billingApproveTarget,
        phaseElapsed / phaseDuration,
      );
      break;
    case "clickApprove":
      cursorPos = billingApproveTarget;
      buttonPressed = phaseElapsed < 280;
      break;
    case "celebrate":
      cursorPos = lerpCursor(
        billingApproveTarget,
        middleApproveTarget,
        transitionProgress(
          phase,
          phaseElapsed,
          phaseDuration,
          "celebrate",
          "moveToApprove2",
          "moveToApprove2",
          phaseOrder,
        ),
      );
      break;
    case "moveToApprove2":
      cursorPos = lerpCursor(
        billingApproveTarget,
        middleApproveTarget,
        transitionProgress(
          phase,
          phaseElapsed,
          phaseDuration,
          "celebrate",
          "moveToApprove2",
          "clickApprove2",
          phaseOrder,
        ),
      );
      break;
    case "clickApprove2":
      cursorPos = middleApproveTarget;
      buttonPressed = phaseElapsed < 280;
      break;
    case "celebrate2":
      cursorPos = lerpCursor(
        middleApproveTarget,
        scopeEditTarget,
        transitionProgress(
          phase,
          phaseElapsed,
          phaseDuration,
          "celebrate2",
          "moveToEdit",
          "moveToEdit",
          phaseOrder,
        ),
      );
      break;
    case "moveToEdit":
      cursorPos = lerpCursor(
        middleApproveTarget,
        scopeEditTarget,
        transitionProgress(
          phase,
          phaseElapsed,
          phaseDuration,
          "celebrate2",
          "moveToEdit",
          "clickEdit",
          phaseOrder,
        ),
      );
      break;
    case "clickEdit":
      cursorPos = scopeEditTarget;
      buttonPressed = phaseElapsed < 280;
      break;
    case "panelOpen": {
      const t = Math.min(1, phaseElapsed / 520);
      cursorPos = lerpCursor(scopeEditTarget, composerRest, t);
      break;
    }
    case "typing":
    case "hold":
      cursorPos = composerRest;
      break;
    case "moveToSend":
      cursorPos = lerpCursor(
        composerRest,
        sendTarget,
        phaseElapsed / phaseDuration,
      );
      break;
    case "clickSend":
      cursorPos = sendTarget;
      buttonPressed = phaseElapsed < 280;
      break;
    case "saltReply":
    case "stripeConnect":
    case "gmailConnect":
    case "readyToSend":
      cursorPos = sendTarget;
      break;
    case "typingSendIt": {
      const blendMs = 480;
      if (phaseElapsed < blendMs) {
        cursorPos = lerpCursor(sendTarget, composerRest, phaseElapsed / blendMs);
      } else {
        cursorPos = composerRest;
      }
      break;
    }
    case "holdSendIt":
    case "sentConfirmation":
    case "complete":
      cursorPos = composerRest;
      break;
    case "moveToSendReply":
      cursorPos = lerpCursor(
        composerRest,
        sendTarget,
        phaseElapsed / phaseDuration,
      );
      break;
    case "clickSendReply":
      cursorPos = sendTarget;
      buttonPressed = phaseElapsed < 280;
      break;
  }

  const editInChat = isMessageSent(phase, phaseElapsed);

  let typedText = "";
  if (!editInChat) {
    if (phase === "typing") {
      const chars = Math.min(
        DEMO_EDIT_TEXT.length,
        Math.floor(phaseElapsed / MS_PER_CHAR) + 1,
      );
      typedText = DEMO_EDIT_TEXT.slice(0, chars);
    } else if (phase === "hold" || phase === "moveToSend" || phase === "clickSend") {
      typedText = DEMO_EDIT_TEXT;
    }
  }

  const sendItInChat = isSendItSent(phase, phaseElapsed);

  let sendItTypedText = "";
  if (!sendItInChat) {
    if (phase === "typingSendIt") {
      const chars = Math.min(
        DEMO_SEND_IT_TEXT.length,
        Math.floor(phaseElapsed / MS_PER_CHAR_SEND_IT) + 1,
      );
      sendItTypedText = DEMO_SEND_IT_TEXT.slice(0, chars);
    } else if (
      phase === "holdSendIt" ||
      phase === "moveToSendReply" ||
      phase === "clickSendReply"
    ) {
      sendItTypedText = DEMO_SEND_IT_TEXT;
    }
  }

  let composerText = sendItTypedText || typedText;
  const demoChat = buildDemoChat(phase, phaseElapsed, phaseOrder);

  return {
    phase,
    approvedPlayIds,
    burstPlayId,
    confettiBurst,
    askOpen,
    scopeEditPressed,
    sendPressed,
    cursorPos,
    typedText,
    composerText,
    demoChat,
    cursorVisible,
    cursorOpacity,
    buttonPressed,
    scrollOffset,
    tapSwiping,
  };
}
