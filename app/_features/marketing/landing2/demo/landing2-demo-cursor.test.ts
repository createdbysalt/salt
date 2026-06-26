/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  isFiniteCursorPosition,
  measureDemoButtonTarget,
} from "./landing2-demo-cursor";

describe("measureDemoButtonTarget", () => {
  it("returns null when the measurement layer has zero width", () => {
    const layer = document.createElement("div");
    const button = document.createElement("button");
    layer.appendChild(button);

    Object.defineProperty(layer, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 0,
        height: 900,
        right: 0,
        bottom: 900,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(button, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    expect(measureDemoButtonTarget(layer, button)).toBeNull();
  });

  it("returns finite coordinates for a laid-out target", () => {
    const layer = document.createElement("div");
    const button = document.createElement("button");
    layer.appendChild(button);

    Object.defineProperty(layer, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 450,
        right: 800,
        bottom: 450,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(button, "getBoundingClientRect", {
      value: () => ({
        left: 400,
        top: 200,
        width: 40,
        height: 32,
        right: 440,
        bottom: 232,
        x: 400,
        y: 200,
        toJSON: () => ({}),
      }),
    });

    const pos = measureDemoButtonTarget(layer, button, 1600);
    expect(pos).not.toBeNull();
    expect(isFiniteCursorPosition(pos)).toBe(true);
  });
});

describe("isFiniteCursorPosition", () => {
  it("rejects NaN coordinates", () => {
    expect(isFiniteCursorPosition({ x: NaN, y: 100 })).toBe(false);
    expect(isFiniteCursorPosition(null)).toBe(false);
  });
});
