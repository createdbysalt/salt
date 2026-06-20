"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "./hq/DemoTopBar";
import { HQTabs } from "./hq/DemoHQTabs";
import { BriefingHero } from "./hq/DemoBriefingHero";
import { PlayQueue } from "./hq/DemoPlayQueue";
import { SideRail } from "./hq/DemoSideRail";
import { AskSaltPanel, type AskSaltContext } from "./hq/DemoAskSaltPanel";
import { ApproveCelebration } from "./ApproveCelebration";
import { Landing2DemoSidebar } from "./Landing2DemoSidebar";
import { Landing2DemoCursor } from "./Landing2DemoCursor";
import { measureDemoButtonTarget } from "./landing2-demo-cursor";
import {
  useWorkspaceDemoTimeline,
  type CursorPosition,
} from "./useWorkspaceDemoTimeline";
import { useDemoCanvasScale } from "./useDemoCanvasScale";

const CANVAS_W = 1600;
const CANVAS_H = 900;
export const DEMO_PANEL_WIDTH = 320;
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const DEMO_SCOPE_CONTEXT: AskSaltContext = {
  kind: "edit-play",
  playId: "3",
  subject: "Reply to Cedar's scope request",
  recipient: "Ari Chen · Cedar Studio",
  player: "Scope",
  suggestedPrompt: "Edit this Play before it sends — ",
};

function DesktopDemoLoadingShell() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-card"
      aria-hidden
    >
      <div className="size-2 animate-pulse rounded-full bg-foreground/20" />
    </div>
  );
}

export function Landing2WorkspaceDemo({ frozen = false }: { frozen?: boolean }) {
  const { containerRef, scale, demoReady } = useDemoCanvasScale(CANVAS_W);
  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const billingApproveRef = useRef<HTMLButtonElement>(null);
  const middleApproveRef = useRef<HTMLButtonElement>(null);
  const scopeEditRef = useRef<HTMLButtonElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const cursorTargetsRef = useRef<{
    billingApprove: CursorPosition | null;
    middleApprove: CursorPosition | null;
    scopeEdit: CursorPosition | null;
    send: CursorPosition | null;
  }>({ billingApprove: null, middleApprove: null, scopeEdit: null, send: null });

  const getCursorTargets = useCallback(() => cursorTargetsRef.current, []);

  const {
    phase,
    approvedPlayIds,
    burstPlayId,
    confettiBurst,
    askOpen,
    scopeEditPressed,
    buttonPressed,
    cursorPos,
    composerText,
    demoChat,
    cursorVisible,
    cursorOpacity,
  } = useWorkspaceDemoTimeline(getCursorTargets, {
    enabled: !frozen && demoReady,
    variant: "desktop",
  });

  const measureCursorTargets = useCallback(() => {
    const layer = cursorLayerRef.current;
    if (!layer) return;

    const billingApprove = billingApproveRef.current;
    const middleApprove = middleApproveRef.current;
    const scopeEdit = scopeEditRef.current;
    const send = sendRef.current;
    cursorTargetsRef.current = {
      billingApprove: billingApprove
        ? measureDemoButtonTarget(layer, billingApprove, CANVAS_W)
        : null,
      middleApprove: middleApprove
        ? measureDemoButtonTarget(layer, middleApprove, CANVAS_W)
        : null,
      scopeEdit: scopeEdit ? measureDemoButtonTarget(layer, scopeEdit, CANVAS_W) : null,
      send: send ? measureDemoButtonTarget(layer, send, CANVAS_W) : null,
    };
  }, []);

  const schedulePostLayoutMeasure = useCallback(() => {
    measureCursorTargets();
    requestAnimationFrame(() => {
      measureCursorTargets();
      requestAnimationFrame(measureCursorTargets);
    });
    window.setTimeout(measureCursorTargets, 420);
  }, [measureCursorTargets]);

  useLayoutEffect(() => {
    measureCursorTargets();
    requestAnimationFrame(measureCursorTargets);
  }, [phase, askOpen, approvedPlayIds, scale, measureCursorTargets]);

  useLayoutEffect(() => {
    if (approvedPlayIds.length === 0) return;
    schedulePostLayoutMeasure();
  }, [approvedPlayIds, schedulePostLayoutMeasure]);

  return (
    <div
      className="pointer-events-none select-none rounded-2xl shadow-[var(--shadow-lift)]"
      aria-hidden
    >
    <div
      ref={containerRef}
      className="relative isolate aspect-[1600/900] w-full max-w-full overflow-hidden rounded-2xl border border-foreground/10 bg-card [contain:layout] touch-none"
    >
      <p className="sr-only">
        Decorative preview of the Salt HQ workspace: approve billing, approve a Cedar recap, edit the
        scope drift play in Ask Salt, send the change, watch Salt update Stripe and Gmail, then send
        the reply and save context to Memory.
      </p>

      {!demoReady && !frozen && <DesktopDemoLoadingShell />}

      {scale !== null && (demoReady || frozen) && (
      <div
        ref={canvasRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
        }}
      >
        <div
          ref={cursorLayerRef}
          data-landing-demo-canvas
          className="pointer-events-none relative flex h-[900px] w-[1600px] overflow-hidden bg-background"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-0 size-[600px] rounded-full bg-sky/20 blur-[120px]" />
            <div className="absolute right-0 top-1/3 size-[500px] rounded-full bg-flame/15 blur-[120px]" />
            <div className="absolute bottom-0 left-0 size-[500px] rounded-full bg-violet/15 blur-[120px]" />
          </div>

          <Landing2DemoSidebar />

          <motion.div
            animate={{ marginRight: askOpen ? DEMO_PANEL_WIDTH : 0 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
            className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
          >
            <TopBar demoMode askActive={askOpen} onAskSalt={() => {}} />

            <main className="flex-1 overflow-hidden px-10 py-5">
              <div className="mx-auto max-w-[1400px]">
                <HQTabs active="today" onChange={() => {}} demoMode />

                <div className="mt-6 grid grid-cols-[1fr_360px] gap-6">
                  <div className="min-w-0 overflow-hidden">
                    <div className="space-y-6">
                      <BriefingHero demoMode />
                      <PlayQueue
                        demo={{
                          approvedIds: approvedPlayIds,
                          burstId: burstPlayId,
                          billingApproveRef,
                          middleApproveRef,
                          scopeEditRef,
                        }}
                      />
                    </div>
                  </div>
                  <SideRail />
                </div>
              </div>
            </main>
          </motion.div>

          <ApproveCelebration burst={confettiBurst} containment="parent" />

          <AnimatePresence>
            {askOpen && (
              <AskSaltPanel
                key="ask-demo"
                layout="embedded"
                embeddedWidth={DEMO_PANEL_WIDTH}
                context={DEMO_SCOPE_CONTEXT}
                demoText={composerText}
                demoChat={demoChat}
                sendRef={sendRef}
                onClose={() => {}}
              />
            )}
          </AnimatePresence>

          <Landing2DemoCursor
            position={cursorPos ?? { x: 640, y: 580 }}
            pressing={buttonPressed || scopeEditPressed}
            visible={cursorVisible}
            opacity={cursorOpacity}
          />
        </div>
      </div>
      )}
    </div>
    </div>
  );
}
