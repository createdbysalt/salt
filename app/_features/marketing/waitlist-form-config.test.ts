import { describe, it, expect } from "vitest";
import {
  qualStepsFromFormFields,
  resolveWaitlistForm,
  WAITLIST_FORM_FALLBACK,
} from "./waitlist-form-config";
import { WAITLIST_QUAL_STEPS } from "./waitlist-qualification";

describe("waitlist-form-config", () => {
  it("falls back to hardcoded qual steps when fields are empty", () => {
    expect(qualStepsFromFormFields([])).toEqual(WAITLIST_QUAL_STEPS);
    expect(resolveWaitlistForm(null).qualSteps.length).toBe(
      WAITLIST_QUAL_STEPS.length
    );
  });

  it("maps multi-select fields to multi qual steps", () => {
    const steps = qualStepsFromFormFields([
      {
        key: "tools",
        label: "Tools",
        fieldType: "multi-select",
        options: [{ value: "stripe", label: "Stripe" }],
        sortOrder: 1,
      },
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("multi");
    expect(steps[0]?.field).toBe("tools");
  });

  it("resolves copy from Sanity document with fallback", () => {
    const resolved = resolveWaitlistForm({
      ...WAITLIST_FORM_FALLBACK,
      heading: "Custom heading",
      submitLabel: "Get early access",
    });

    expect(resolved.heading).toBe("Custom heading");
    expect(resolved.submitLabel).toBe("Get early access");
    expect(resolved.emailPlaceholder).toBe("you@business.com");
  });
});
