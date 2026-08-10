import type { PlayRunState } from "../types";

const TRANSITIONS: Record<PlayRunState, PlayRunState[]> = {
  draft: ["queued", "dismissed"],
  queued: ["approved", "scheduled", "dismissed", "ran"],
  approved: ["scheduled", "executing", "ran", "dismissed"],
  scheduled: ["executing", "ran", "dismissed"],
  // executing is entered only via the executor's atomic claim; dismissed here
  // means a guard step decided the play's conditions no longer hold.
  executing: ["ran", "failed", "dismissed", "blocked"],
  ran: [],
  failed: ["queued", "dismissed"],
  dismissed: [],
  // Blocked runs (toolkit reconnect, pacing, exhausted bundle) go back to
  // approved once the cause is fixed, or are dismissed. The executor's claim
  // also accepts approved directly, so no extra hop is needed to re-run.
  blocked: ["approved", "dismissed"],
};

export function canTransitionPlayRun(
  from: PlayRunState,
  to: PlayRunState,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPlayRunTransition(
  from: PlayRunState,
  to: PlayRunState,
): void {
  if (!canTransitionPlayRun(from, to)) {
    throw new Error(`Invalid play run transition: ${from} → ${to}`);
  }
}

export function nextStateForAction(
  action: "approve" | "dismiss" | "schedule" | "mark_ran",
  current: PlayRunState,
): PlayRunState {
  switch (action) {
    case "approve":
      assertPlayRunTransition(current, "approved");
      return "approved";
    case "dismiss":
      assertPlayRunTransition(current, "dismissed");
      return "dismissed";
    case "schedule":
      assertPlayRunTransition(current, "scheduled");
      return "scheduled";
    case "mark_ran":
      assertPlayRunTransition(current, "ran");
      return "ran";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
