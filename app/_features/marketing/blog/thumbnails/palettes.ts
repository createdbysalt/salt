export type BlogThumbPalette = {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
};

export const blogThumbPalettes = {
  cobalt: { bg: "#146EF5", fg: "#FFFFFF", accent: "#0B4FB8", muted: "#93B8FF" },
  coral: { bg: "#E8563A", fg: "#FFFFFF", accent: "#141414", muted: "#FFB4A6" },
  ink: { bg: "#141414", fg: "#FFFFFF", accent: "#47E06B", muted: "#3A3A3A" },
  lilac: { bg: "#6B4EFF", fg: "#FFFFFF", accent: "#C4B8FF", muted: "#4A35CC" },
  mint: { bg: "#E8F4F8", fg: "#146EF5", accent: "#141414", muted: "#B8D4E8" },
  rose: { bg: "#F2E4EA", fg: "#141414", accent: "#FF2D6F", muted: "#D4B8C4" },
  forest: { bg: "#0F2E1A", fg: "#FFFFFF", accent: "#47E06B", muted: "#1E4D2E" },
  sand: { bg: "#F5F0E8", fg: "#141414", accent: "#E8563A", muted: "#D9CFC0" },
} as const satisfies Record<string, BlogThumbPalette>;

export type BlogThumbPaletteName = keyof typeof blogThumbPalettes;
