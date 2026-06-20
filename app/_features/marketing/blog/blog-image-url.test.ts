import { describe, expect, it } from "vitest";
import { toAbsoluteBlogImageUrl } from "@/app/_features/marketing/blog/blog-image-url";

describe("toAbsoluteBlogImageUrl", () => {
  it("passes through absolute Sanity CDN URLs", () => {
    const url = "https://cdn.sanity.io/images/x/y/z.jpg";
    expect(toAbsoluteBlogImageUrl(url)).toBe(url);
  });

  it("prefixes relative paths with the site origin", () => {
    expect(toAbsoluteBlogImageUrl("/learn/foo/header.png")).toBe(
      "https://usesalt.io/learn/foo/header.png"
    );
  });
});
