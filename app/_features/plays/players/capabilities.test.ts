import { describe, expect, it } from "vitest";
import {
  PLAYER_CAPABILITIES,
  SYSTEM_PLAYER_SLUGS,
  getPlayerCapabilities,
  playerCanWriteMemory,
  playerAlwaysRequiresApproval,
  playerAllowsPlaybookKind,
  GENERAL_PLAYER_CAPABILITIES,
} from "./capabilities";

describe("Player Capabilities Registry", () => {
  describe("PLAYER_CAPABILITIES", () => {
    it("includes all player types (system + general)", () => {
      expect(Object.keys(PLAYER_CAPABILITIES)).toEqual([
        "keeper",
        "billing",
        "follow-up",
        "brief",
        "client-risk",
        "scope",
        "general",
      ]);
    });

    it("keeper is the only player that can write memory", () => {
      const memoryWriters = Object.values(PLAYER_CAPABILITIES).filter(
        (p) => p.canWriteMemory,
      );
      expect(memoryWriters).toHaveLength(1);
      expect(memoryWriters[0].slug).toBe("keeper");
    });

    it("keeper only allows profile playbooks", () => {
      expect(PLAYER_CAPABILITIES.keeper.allowedPlaybookKinds).toEqual(["profile"]);
    });

    it("non-keeper players allow acting playbooks", () => {
      const nonKeepers = Object.values(PLAYER_CAPABILITIES).filter(
        (p) => p.slug !== "keeper",
      );
      for (const player of nonKeepers) {
        expect(player.allowedPlaybookKinds).toContain("acting");
      }
    });

    it("all system players (excluding general) are marked isSystem: true", () => {
      for (const player of Object.values(PLAYER_CAPABILITIES)) {
        if (player.slug === "general") {
          expect(player.isSystem).toBe(false);
        } else {
          expect(player.isSystem).toBe(true);
        }
      }
    });

    it("no system player can use destructive actions", () => {
      for (const player of Object.values(PLAYER_CAPABILITIES)) {
        expect(player.canUseDestructive).toBe(false);
      }
    });
  });

  describe("GENERAL_PLAYER_CAPABILITIES (future)", () => {
    it("always requires approval", () => {
      expect(GENERAL_PLAYER_CAPABILITIES.alwaysRequiresApproval).toBe(true);
    });

    it("cannot write memory", () => {
      expect(GENERAL_PLAYER_CAPABILITIES.canWriteMemory).toBe(false);
    });

    it("cannot use destructive actions", () => {
      expect(GENERAL_PLAYER_CAPABILITIES.canUseDestructive).toBe(false);
    });

    it("is not a system player", () => {
      expect(GENERAL_PLAYER_CAPABILITIES.isSystem).toBe(false);
    });
  });

  describe("getPlayerCapabilities", () => {
    it("returns capabilities for known slugs", () => {
      expect(getPlayerCapabilities("keeper")).toBe(PLAYER_CAPABILITIES.keeper);
      expect(getPlayerCapabilities("billing")).toBe(PLAYER_CAPABILITIES.billing);
    });

    it("returns null for unknown slugs", () => {
      expect(getPlayerCapabilities("unknown")).toBeNull();
      expect(getPlayerCapabilities("")).toBeNull();
    });
  });

  describe("playerCanWriteMemory", () => {
    it("returns true for keeper", () => {
      expect(playerCanWriteMemory("keeper")).toBe(true);
    });

    it("returns false for non-keeper players", () => {
      expect(playerCanWriteMemory("billing")).toBe(false);
      expect(playerCanWriteMemory("follow-up")).toBe(false);
      expect(playerCanWriteMemory("brief")).toBe(false);
    });

    it("returns false for unknown players", () => {
      expect(playerCanWriteMemory("unknown")).toBe(false);
    });
  });

  describe("playerAlwaysRequiresApproval", () => {
    it("returns false for system players", () => {
      for (const slug of SYSTEM_PLAYER_SLUGS) {
        expect(playerAlwaysRequiresApproval(slug)).toBe(false);
      }
    });

    it("defaults to true for unknown players (fail safe)", () => {
      expect(playerAlwaysRequiresApproval("unknown")).toBe(true);
    });
  });

  describe("playerAllowsPlaybookKind", () => {
    it("keeper allows profile but not acting", () => {
      expect(playerAllowsPlaybookKind("keeper", "profile")).toBe(true);
      expect(playerAllowsPlaybookKind("keeper", "acting")).toBe(false);
    });

    it("billing allows acting but not profile", () => {
      expect(playerAllowsPlaybookKind("billing", "acting")).toBe(true);
      expect(playerAllowsPlaybookKind("billing", "profile")).toBe(false);
    });

    it("defaults to false for unknown players", () => {
      expect(playerAllowsPlaybookKind("unknown", "acting")).toBe(false);
      expect(playerAllowsPlaybookKind("unknown", "profile")).toBe(false);
    });
  });

  describe("SYSTEM_PLAYER_SLUGS", () => {
    it("includes all system player slugs", () => {
      expect(SYSTEM_PLAYER_SLUGS).toEqual([
        "keeper",
        "billing",
        "follow-up",
        "brief",
        "client-risk",
        "scope",
      ]);
    });
  });
});
