/**
 * Debounced batch-save queue for connector tool preferences (P0 fix for the
 * per-toggle round trip). Toggles update local state instantly; the queue
 * persists only the FINAL value ~600ms after the last change. If a save is
 * in flight when new changes land, the latest value is saved again once the
 * in-flight request settles — no interleaving, no lost updates.
 *
 * Pure TS (no React) so it is unit-testable with fake timers.
 */

export type SaveQueueStatus = "idle" | "pending" | "saving" | "saved";

export type SaveResult = { success: true } | { success: false; error: string };

export interface SaveQueueOptions<T> {
  /** Persist the value. Must never throw for expected failures. */
  save: (value: T) => Promise<SaveResult>;
  /** Called after a value is durably persisted. */
  onSaved: (value: T) => void;
  /** Called when persisting fails (after retries are exhausted — none today). */
  onError: (value: T, error: string) => void;
  /** Status transitions for a UI indicator (aria-live "Saving…/Saved"). */
  onStatusChange?: (status: SaveQueueStatus) => void;
  /** Debounce window in ms after the last schedule() call. */
  delayMs?: number;
}

export interface SaveQueue<T> {
  /** Record the latest value and (re)start the debounce timer. */
  schedule: (value: T) => void;
  /** Persist any pending value immediately (e.g. on unmount). */
  flush: () => void;
  /** Drop any pending value without saving. */
  cancel: () => void;
}

export function createSaveQueue<T>({
  save,
  onSaved,
  onError,
  onStatusChange,
  delayMs = 600,
}: SaveQueueOptions<T>): SaveQueue<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: { value: T } | null = null;
  let inFlight = false;

  const setStatus = (status: SaveQueueStatus) => {
    onStatusChange?.(status);
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const run = async () => {
    clearTimer();
    if (inFlight || latest === null) {
      // An in-flight save picks the pending value up when it settles.
      return;
    }
    const { value } = latest;
    latest = null;
    inFlight = true;
    setStatus("saving");

    let result: SaveResult;
    try {
      result = await save(value);
    } catch {
      result = { success: false, error: "Failed to save tool preferences." };
    }
    inFlight = false;

    if (result.success) {
      onSaved(value);
    } else {
      onError(value, result.error);
    }

    if (latest !== null) {
      // Newer changes arrived while saving — persist the latest value now.
      void run();
      return;
    }
    setStatus(result.success ? "saved" : "idle");
  };

  return {
    schedule(value: T) {
      latest = { value };
      clearTimer();
      setStatus("pending");
      timer = setTimeout(() => {
        void run();
      }, delayMs);
    },
    flush() {
      if (latest !== null) {
        void run();
      }
    },
    cancel() {
      clearTimer();
      latest = null;
      if (!inFlight) {
        setStatus("idle");
      }
    },
  };
}
