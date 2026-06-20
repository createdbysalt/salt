import { describe, expect, it } from "vitest";
import { extractYoutubeEmbeds } from "./extract-youtube-embeds";

describe("extractYoutubeEmbeds", () => {
  it("extracts youtube video ids from portable text blocks", () => {
    const embeds = extractYoutubeEmbeds([
      {
        _type: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        caption: "Demo video",
      },
    ]);

    expect(embeds).toEqual([
      {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
        name: "Demo video",
      },
    ]);
  });
});
