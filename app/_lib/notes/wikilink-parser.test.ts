import { describe, it, expect } from "vitest";
import {
  extractWikilinks,
  resolveWikilinks,
  getLinkedEntityIds,
  renderWikilinksToHtml,
  hasWikilinks,
  countWikilinks,
  nameToSlug,
  type ResolvedEntity,
} from "./wikilink-parser";

describe("wikilink-parser", () => {
  describe("extractWikilinks", () => {
    it("extracts simple wikilinks", () => {
      const content = "Met with [[Maya Chen]] today about the project.";
      const links = extractWikilinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        raw: "[[Maya Chen]]",
        target: "Maya Chen",
        alias: null,
      });
    });

    it("extracts aliased wikilinks", () => {
      const content = "Working with [[Acme Corp|our biggest client]] on Q3.";
      const links = extractWikilinks(content);

      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        raw: "[[Acme Corp|our biggest client]]",
        target: "Acme Corp",
        alias: "our biggest client",
      });
    });

    it("extracts multiple wikilinks", () => {
      const content =
        "[[Maya Chen]] introduced me to [[James Wilson]] at [[Acme Corp]].";
      const links = extractWikilinks(content);

      expect(links).toHaveLength(3);
      expect(links.map((l) => l.target)).toEqual([
        "Maya Chen",
        "James Wilson",
        "Acme Corp",
      ]);
    });

    it("returns empty array for content without wikilinks", () => {
      const content = "Just a regular note without any links.";
      const links = extractWikilinks(content);

      expect(links).toHaveLength(0);
    });

    it("tracks positions correctly", () => {
      const content = "Hello [[World]]!";
      const links = extractWikilinks(content);

      expect(links[0].position).toEqual({
        start: 6,
        end: 15,
      });
    });

    it("handles wikilinks with extra whitespace", () => {
      const content = "Meeting with [[  Maya Chen  ]] tomorrow.";
      const links = extractWikilinks(content);

      expect(links[0].target).toBe("Maya Chen");
    });
  });

  describe("resolveWikilinks", () => {
    const entities: ResolvedEntity[] = [
      { id: "p1", type: "person", name: "Maya Chen", slug: "maya-chen" },
      { id: "o1", type: "org", name: "Acme Corp", slug: "acme-corp" },
      { id: "w1", type: "work", name: "Q3 Campaign", slug: "q3-campaign" },
    ];

    it("resolves wikilinks to entities by name", () => {
      const content = "Met with [[Maya Chen]] today.";
      const resolved = resolveWikilinks(content, entities);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].exists).toBe(true);
      expect(resolved[0].entity).toMatchObject({
        id: "p1",
        type: "person",
        name: "Maya Chen",
      });
    });

    it("resolves wikilinks by slug", () => {
      const content = "Check out [[maya-chen]]'s profile.";
      const resolved = resolveWikilinks(content, entities);

      expect(resolved[0].exists).toBe(true);
      expect(resolved[0].entity?.id).toBe("p1");
    });

    it("marks non-existent entities", () => {
      const content = "Need to contact [[Unknown Person]].";
      const resolved = resolveWikilinks(content, entities);

      expect(resolved[0].exists).toBe(false);
      expect(resolved[0].entity).toBeNull();
    });

    it("matches case-insensitively", () => {
      const content = "Meeting at [[ACME CORP]] offices.";
      const resolved = resolveWikilinks(content, entities);

      expect(resolved[0].exists).toBe(true);
      expect(resolved[0].entity?.id).toBe("o1");
    });
  });

  describe("getLinkedEntityIds", () => {
    const entities: ResolvedEntity[] = [
      { id: "p1", type: "person", name: "Maya Chen" },
      { id: "o1", type: "org", name: "Acme Corp" },
    ];

    it("returns unique entity ids", () => {
      const content =
        "[[Maya Chen]] at [[Acme Corp]]. Later met [[Maya Chen]] again.";
      const ids = getLinkedEntityIds(content, entities);

      expect(ids).toHaveLength(2);
      expect(ids).toContainEqual({ id: "p1", type: "person" });
      expect(ids).toContainEqual({ id: "o1", type: "org" });
    });

    it("excludes non-existent entities", () => {
      const content = "[[Maya Chen]] and [[Unknown Person]]";
      const ids = getLinkedEntityIds(content, entities);

      expect(ids).toHaveLength(1);
      expect(ids[0]).toEqual({ id: "p1", type: "person" });
    });
  });

  describe("renderWikilinksToHtml", () => {
    const entities: ResolvedEntity[] = [
      { id: "p1", type: "person", name: "Maya Chen", slug: "maya-chen" },
    ];

    it("renders existing links as anchors", () => {
      const content = "Met [[Maya Chen]] today.";
      const html = renderWikilinksToHtml(content, entities);

      expect(html).toContain('href="/persons/maya-chen"');
      expect(html).toContain('class="wikilink"');
      expect(html).toContain(">Maya Chen</a>");
    });

    it("renders new links with different class", () => {
      const content = "Need to add [[New Person]].";
      const html = renderWikilinksToHtml(content, entities);

      expect(html).toContain('class="wikilink-new"');
      expect(html).toContain(">New Person</a>");
    });

    it("uses alias for display text", () => {
      const content = "Working with [[Maya Chen|our designer]].";
      const html = renderWikilinksToHtml(content, entities);

      expect(html).toContain(">our designer</a>");
    });

    it("accepts custom href template", () => {
      const content = "Check [[Maya Chen]]'s page.";
      const html = renderWikilinksToHtml(content, entities, {
        hrefTemplate: (e) => `/people/${e.id}`,
      });

      expect(html).toContain('href="/people/p1"');
    });
  });

  describe("hasWikilinks", () => {
    it("returns true for content with wikilinks", () => {
      expect(hasWikilinks("Check [[this]] out")).toBe(true);
    });

    it("returns false for content without wikilinks", () => {
      expect(hasWikilinks("No links here")).toBe(false);
    });
  });

  describe("countWikilinks", () => {
    it("counts all wikilinks", () => {
      const content = "[[One]] and [[Two]] and [[Three]]";
      expect(countWikilinks(content)).toBe(3);
    });

    it("returns zero for no wikilinks", () => {
      expect(countWikilinks("No links")).toBe(0);
    });
  });

  describe("nameToSlug", () => {
    it("converts name to slug", () => {
      expect(nameToSlug("Maya Chen")).toBe("maya-chen");
      expect(nameToSlug("Acme Corp Inc.")).toBe("acme-corp-inc");
      expect(nameToSlug("Q3 2024 Campaign")).toBe("q3-2024-campaign");
    });

    it("handles special characters", () => {
      expect(nameToSlug("O'Brien & Associates")).toBe("obrien-associates");
    });
  });
});
