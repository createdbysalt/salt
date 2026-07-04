import { describe, expect, it } from "vitest";
import { extractPalette } from "./brand-metadata-extractor";
import { formatBrandAssetLine } from "./brand-context-builder";

function rgbaPixels(colors: Array<[number, number, number, number]>, repeat: number): Buffer {
  const out: number[] = [];
  for (const [r, g, b, a] of colors) {
    for (let i = 0; i < repeat; i += 1) out.push(r, g, b, a);
  }
  return Buffer.from(out);
}

describe("extractPalette", () => {
  it("ranks colors by frequency and skips transparent pixels", () => {
    const pixels = Buffer.concat([
      rgbaPixels([[230, 80, 40, 255]], 30), // flame — most frequent
      rgbaPixels([[40, 90, 220, 255]], 20), // blue
      rgbaPixels([[10, 200, 10, 0]], 50), // transparent green — must be ignored
    ]);
    const palette = extractPalette(pixels, 4);
    expect(palette[0].hex).toBe("#e65028");
    expect(palette[1].hex).toBe("#285adc");
    expect(palette.some((c) => c.hex === "#0ac80a")).toBe(false);
  });

  it("assigns primary to the first saturated color and neutral to grays", () => {
    const pixels = Buffer.concat([
      rgbaPixels([[128, 128, 128, 255]], 40), // gray — most frequent but neutral
      rgbaPixels([[200, 30, 30, 255]], 20), // red
    ]);
    const palette = extractPalette(pixels, 4);
    expect(palette[0].role).toBe("neutral");
    expect(palette[1].role).toBe("primary");
  });

  it("caps the palette at five colors", () => {
    const colors: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 8; i += 1) {
      colors.push([i * 32, 255 - i * 32, (i * 64) % 255, 255]);
    }
    const palette = extractPalette(rgbaPixels(colors, 5), 4);
    expect(palette.length).toBeLessThanOrEqual(5);
  });

  it("handles 3-channel (no alpha) input", () => {
    const pixels = Buffer.from([250, 10, 10, 250, 10, 10, 10, 10, 250]);
    const palette = extractPalette(pixels, 3);
    expect(palette[0].hex).toBe("#fa0a0a");
  });
});

describe("formatBrandAssetLine", () => {
  it("includes name, type, background, and role-annotated colors", () => {
    const line = formatBrandAssetLine({
      id: "f1",
      file_name: "logo-primary.png",
      brand_metadata: {
        asset_type: "logo",
        variant: "primary",
        background: "transparent",
        colors: [
          { hex: "#e65028", role: "primary" },
          { hex: "#888888", role: "neutral" },
        ],
      },
    });
    expect(line).toContain("logo-primary.png");
    expect(line).toContain("logo");
    expect(line).toContain("primary variant");
    expect(line).toContain("transparent background");
    expect(line).toContain("#e65028 (primary)");
    expect(line).toContain("#888888");
    expect(line).not.toContain("#888888 (neutral)");
  });

  it("degrades gracefully with no metadata", () => {
    const line = formatBrandAssetLine({
      id: "f2",
      file_name: "brand-guide.pdf",
      brand_metadata: null,
    });
    expect(line).toBe("- brand-guide.pdf");
  });
});
