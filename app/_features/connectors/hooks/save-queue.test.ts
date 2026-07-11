import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue, type SaveQueueStatus, type SaveResult } from "./save-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("createSaveQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid changes into one save of the final value", async () => {
    const save = vi.fn(async (_value: string[]): Promise<SaveResult> => ({
      success: true,
    }));
    const onSaved = vi.fn();
    const queue = createSaveQueue({ save, onSaved, onError: vi.fn(), delayMs: 600 });

    queue.schedule(["a"]);
    vi.advanceTimersByTime(300);
    queue.schedule(["a", "b"]);
    vi.advanceTimersByTime(300);
    queue.schedule(["a", "b", "c"]);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(["a", "b", "c"]);
    expect(onSaved).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("reports failures through onError and never through onSaved", async () => {
    const onSaved = vi.fn();
    const onError = vi.fn();
    const queue = createSaveQueue({
      save: async (): Promise<SaveResult> => ({
        success: false,
        error: "Failed to save tool preferences.",
      }),
      onSaved,
      onError,
      delayMs: 600,
    });

    queue.schedule(["a"]);
    await vi.advanceTimersByTimeAsync(600);

    expect(onSaved).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(["a"], "Failed to save tool preferences.");
  });

  it("treats a thrown save as a failure", async () => {
    const onError = vi.fn();
    const queue = createSaveQueue<string[]>({
      save: async () => {
        throw new Error("network down");
      },
      onSaved: vi.fn(),
      onError,
      delayMs: 600,
    });

    queue.schedule(["a"]);
    await vi.advanceTimersByTimeAsync(600);

    expect(onError).toHaveBeenCalledWith(["a"], "Failed to save tool preferences.");
  });

  it("re-saves the latest value when changes arrive while a save is in flight", async () => {
    const first = deferred<SaveResult>();
    const calls: string[][] = [];
    const save = vi.fn(async (value: string[]): Promise<SaveResult> => {
      calls.push(value);
      if (calls.length === 1) {
        return first.promise;
      }
      return { success: true };
    });
    const onSaved = vi.fn();
    const queue = createSaveQueue({ save, onSaved, onError: vi.fn(), delayMs: 600 });

    queue.schedule(["a"]);
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);

    // Change lands while save #1 is still in flight; its timer fires too.
    queue.schedule(["a", "b"]);
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);

    first.resolve({ success: true });
    await vi.runAllTimersAsync();

    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1]).toEqual(["a", "b"]);
    expect(onSaved).toHaveBeenLastCalledWith(["a", "b"]);
  });

  it("emits pending → saving → saved status transitions", async () => {
    const statuses: SaveQueueStatus[] = [];
    const queue = createSaveQueue<string[]>({
      save: async () => ({ success: true }),
      onSaved: vi.fn(),
      onError: vi.fn(),
      onStatusChange: (status) => statuses.push(status),
      delayMs: 600,
    });

    queue.schedule(["a"]);
    await vi.advanceTimersByTimeAsync(600);

    expect(statuses).toEqual(["pending", "saving", "saved"]);
  });

  it("flush persists immediately and cancel drops pending work", async () => {
    const save = vi.fn(async (): Promise<SaveResult> => ({ success: true }));
    const queue = createSaveQueue<string[]>({
      save,
      onSaved: vi.fn(),
      onError: vi.fn(),
      delayMs: 600,
    });

    queue.schedule(["a"]);
    queue.flush();
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledTimes(1);

    queue.schedule(["b"]);
    queue.cancel();
    await vi.advanceTimersByTimeAsync(1200);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
