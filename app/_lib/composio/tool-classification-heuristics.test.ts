import { describe, it, expect } from "vitest";
import {
  classifyToolByHeuristic,
  hasManualOverride,
  listManualOverrides,
} from "./tool-classification-heuristics";

describe("tool-classification-heuristics", () => {
  describe("classifyToolByHeuristic", () => {
    describe("manual overrides", () => {
      it("classifies GMAIL_CREATE_DRAFT as mutating without confirmation", () => {
        const result = classifyToolByHeuristic("GMAIL_CREATE_DRAFT");
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(false);
        expect(result.source).toBe("override");
      });

      it("classifies GOOGLEDRIVE_SHARE_FILE as destructive", () => {
        const result = classifyToolByHeuristic("GOOGLEDRIVE_SHARE_FILE");
        expect(result.risk).toBe("destructive");
        expect(result.requiresHumanConfirmation).toBe(true);
        expect(result.source).toBe("override");
      });

      it("classifies SLACK_ADD_REACTION_TO_AN_ITEM as mutating without confirmation", () => {
        const result = classifyToolByHeuristic("SLACK_ADD_REACTION_TO_AN_ITEM");
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(false);
        expect(result.source).toBe("override");
      });
    });

    describe("destructive patterns", () => {
      it.each([
        "DELETE_USER",
        "USER_DELETE",
        "REMOVE_ITEM",
        "ITEM_REMOVE",
        "EMPTY_TRASH",
        "PURGE_RECORDS",
        "TRASH_FILE",
        "CANCEL_SUBSCRIPTION",
      ])("classifies %s as destructive", (slug) => {
        const result = classifyToolByHeuristic(slug);
        expect(result.risk).toBe("destructive");
        expect(result.requiresHumanConfirmation).toBe(true);
        expect(result.source).toBe("heuristic");
      });
    });

    describe("read patterns", () => {
      it.each([
        "GET_USER",
        "LIST_MESSAGES",
        "SEARCH_CONTACTS",
        "FETCH_DATA",
        "RETRIEVE_CUSTOMER",
        "FIND_FILE",
        "READ_DOCUMENT",
        "QUERY_DATABASE",
        "LOOKUP_RECORD",
        "CHECK_STATUS",
        "VIEW_CALENDAR",
        "SHOW_DETAILS",
        "DESCRIBE_TABLE",
        "USER_INFO",
      ])("classifies %s as read", (slug) => {
        const result = classifyToolByHeuristic(slug);
        expect(result.risk).toBe("read");
        expect(result.requiresHumanConfirmation).toBe(false);
        expect(result.source).toBe("heuristic");
      });
    });

    describe("mutating patterns", () => {
      it.each([
        "CREATE_USER",
        "UPDATE_RECORD",
        "SEND_EMAIL",
        "POST_MESSAGE",
        "ADD_MEMBER",
        "INSERT_ROW",
        "WRITE_FILE",
        "SET_PROPERTY",
        "MODIFY_SETTINGS",
        "EDIT_DOCUMENT",
        "PATCH_RESOURCE",
        "UPLOAD_FILE",
        "MOVE_FILE",
        "COPY_FILE",
        "INVITE_USER",
        "ASSIGN_TASK",
        "SCHEDULE_MEETING",
        "BOOK_APPOINTMENT",
        "RESERVE_SLOT",
        "SUBSCRIBE_TO_EVENT",
        "ENABLE_FEATURE",
        "DISABLE_FEATURE",
        "APPROVE_REQUEST",
        "REJECT_REQUEST",
        "FORWARD_EMAIL",
        "REPLY_TO_MESSAGE",
      ])("classifies %s as mutating with confirmation", (slug) => {
        const result = classifyToolByHeuristic(slug);
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(true);
        expect(result.source).toBe("heuristic");
      });
    });

    describe("default classification", () => {
      it("classifies unknown patterns as mutating with confirmation", () => {
        const result = classifyToolByHeuristic("SOME_UNKNOWN_TOOL");
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(true);
        expect(result.source).toBe("heuristic");
        expect(result.pattern).toBe("default");
      });

      it("classifies ambiguous tools conservatively", () => {
        const result = classifyToolByHeuristic("PROCESS_DATA");
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(true);
      });
    });

    describe("case insensitivity", () => {
      it("handles lowercase slugs", () => {
        const result = classifyToolByHeuristic("gmail_create_draft");
        expect(result.risk).toBe("mutating");
        expect(result.requiresHumanConfirmation).toBe(false);
        expect(result.source).toBe("override");
      });

      it("handles mixed case slugs", () => {
        const result = classifyToolByHeuristic("Get_User");
        expect(result.risk).toBe("read");
      });
    });

    describe("real Composio tool slugs", () => {
      it.each([
        ["GMAIL_LIST_MESSAGES", "read"],
        ["GMAIL_GET_MESSAGE", "read"],
        ["GMAIL_SEND_EMAIL", "mutating"],
        ["GOOGLECALENDAR_LIST_EVENTS", "read"],
        ["GOOGLECALENDAR_CREATE_EVENT", "mutating"],
        ["GOOGLECALENDAR_DELETE_EVENT", "destructive"],
        ["STRIPE_LIST_CUSTOMERS", "read"],
        ["STRIPE_CREATE_CUSTOMER", "mutating"],
        ["STRIPE_DELETE_CUSTOMER", "destructive"],
        ["SLACK_FETCH_CONVERSATION_HISTORY", "read"],
        ["SLACK_CHAT_POST_MESSAGE", "mutating"],
        ["NOTION_GET_PAGE_MARKDOWN", "read"],
        ["NOTION_CREATE_NOTION_PAGE", "mutating"],
        ["NOTION_DELETE_BLOCK", "destructive"],
      ])("classifies %s as %s", (slug, expectedRisk) => {
        const result = classifyToolByHeuristic(slug);
        expect(result.risk).toBe(expectedRisk);
      });
    });
  });

  describe("hasManualOverride", () => {
    it("returns true for overridden slugs", () => {
      expect(hasManualOverride("GMAIL_CREATE_DRAFT")).toBe(true);
      expect(hasManualOverride("gmail_create_draft")).toBe(true);
    });

    it("returns false for non-overridden slugs", () => {
      expect(hasManualOverride("GMAIL_SEND_EMAIL")).toBe(false);
    });
  });

  describe("listManualOverrides", () => {
    it("returns all manual overrides with metadata", () => {
      const overrides = listManualOverrides();
      expect(overrides.length).toBeGreaterThan(0);

      const gmailDraft = overrides.find((o) => o.slug === "GMAIL_CREATE_DRAFT");
      expect(gmailDraft).toBeDefined();
      expect(gmailDraft?.risk).toBe("mutating");
      expect(gmailDraft?.confirmation).toBe(false);
      expect(gmailDraft?.reason).toContain("Invisible");
    });
  });
});
