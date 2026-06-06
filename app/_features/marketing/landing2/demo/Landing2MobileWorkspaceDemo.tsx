"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { TopBar } from "./hq/DemoTopBar";
import { HQTabs } from "./hq/DemoHQTabs";
import { BriefingHero } from "./hq/DemoBriefingHero";
import { PlayQueue } from "./hq/DemoPlayQueue";
import { AskSaltPanel, type AskSaltContext } from "./hq/DemoAskSaltPanel";
import { ApproveCelebration } from "./ApproveCelebration";
import { Landing2DemoTap } from "./Landing2DemoTap";
import { measureDemoTapTarget } from "./landing2-demo-cursor";
import {
  useWorkspaceDemoTimeline,
  MOBILE_CANVAS_W,
  MOBILE_CANVAS_H,
  type CursorPosition,
} from "./useWorkspaceDemoTimeline";
import { useDemoCanvasScale } from "./useDemoCanvasScale";

const DEMO_SCOPE_CONTEXT: AskSaltContext = {
  kind: "edit-play",
  playId: "3",
  subject: "Reply to Cedar's scope request",
  recipient: "Ari Chen · Cedar Studio",
  player: "Scope",
  suggestedPrompt: "Edit this Play before it sends — ",
};

function MobileDemoLoadingShell() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-background"
      aria-hidden
    >
      <div className="size-2 animate-pulse rounded-full bg-foreground/20" />
    </div>
  );
}

export function Landing2MobileWorkspaceDemo({ embedded = false }: { embedded?: boolean } = {}) {
  const { containerRef, scale, demoReady } = useDemoCanvasScale(MOBILE_CANVAS_W);
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
    scrollOffset,
    tapSwiping,
  } = useWorkspaceDemoTimeline(getCursorTargets, {
    enabled: demoReady,
    variant: "mobile",
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
        ? measureDemoTapTarget(layer, billingApprove, MOBILE_CANVAS_W)
        : null,
      middleApprove: middleApprove
        ? measureDemoTapTarget(layer, middleApprove, MOBILE_CANVAS_W)
        : null,
      scopeEdit: scopeEdit ? measureDemoTapTarget(layer, scopeEdit, MOBILE_CANVAS_W) : null,
      send: send ? measureDemoTapTarget(layer, send, MOBILE_CANVAS_W) : null,
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
  }, [phase, askOpen, approvedPlayIds, scale, scrollOffset, measureCursorTargets]);

  useLayoutEffect(() => {
    if (approvedPlayIds.length === 0) return;
    schedulePostLayoutMeasure();
  }, [approvedPlayIds, schedulePostLayoutMeasure]);

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-[390px] rounded-[28px] shadow-[var(--shadow-lift)]"}>
      <div
        ref={containerRef}
        className={
          embedded
            ? "relative isolate aspect-[390/844] w-full overflow-hidden overscroll-contain bg-card [contain:layout]"
            : "relative isolate aspect-[390/844] w-full overflow-hidden overscroll-contain rounded-[28px] border border-foreground/10 bg-card [contain:layout]"
        }
      >
        <p className="sr-only">
          Decorative mobile preview of the Salt HQ workspace: scroll to plays, approve billing and
          Cedar recap, edit the scope drift play in Ask Salt, send the change, and loop.
        </p>

        {!demoReady && <MobileDemoLoadingShell />}

        {demoReady && (
          <div
            className="absolute left-0 top-0 origin-top-left will-change-transform"
            style={{
              width: MOBILE_CANVAS_W,
              height: MOBILE_CANVAS_H,
              transform: `scale(${scale})`,
            }}
          >
            <div
              ref={cursorLayerRef}
              data-landing-demo-canvas
              data-landing-demo-variant="mobile"
              className="pointer-events-none relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-background"
            >
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-0 top-0 size-[280px] rounded-full bg-sky/20 blur-[90px]" />
                <div className="absolute right-0 top-1/4 size-[220px] rounded-full bg-flame/15 blur-[90px]" />
              </div>

              <TopBar askActive={askOpen} onAskSalt={() => {}} onMenu={() => {}} />

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  className="will-change-transform px-4 pb-6 pt-3"
                  style={{ transform: `translateY(-${scrollOffset}px)` }}
                >
                  <HQTabs active="today" onChange={() => {}} />
                  <div className="mt-4 space-y-5">
                    <BriefingHero />
                    <PlayQueue
                      demo={{
                        approvedIds: approvedPlayIds,
                        burstId: burstPlayId,
                        billingApproveRef,
                        middleApproveRef,
                        scopeEditRef,
                        compactHeader: true,
                      }}
                    />
                  </div>
                </div>
              </div>

              <ApproveCelebration burst={confettiBurst} containment="parent" />

              <AnimatePresence>
                {askOpen && (
                  <AskSaltPanel
                    key="ask-demo-mobile"
                    layout="fullscreen"
                    context={DEMO_SCOPE_CONTEXT}
                    demoText={composerText}
                    demoChat={demoChat}
                    sendRef={sendRef}
                    onClose={() => {}}
                  />
                )}
              </AnimatePresence>

              <Landing2DemoTap
                position={cursorPos ?? { x: 0, y: 0 }}
                tapping={buttonPressed || scopeEditPressed}
                swiping={tapSwiping}
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
