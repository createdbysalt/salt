import type { CompareNarrativeConfig } from "../types";

export const saltAlternativesNarrative: CompareNarrativeConfig = {
  intro: {
    title: "The honest bottom line",
    subtitle:
      "Every alternative shares one assumption: you are the engine. Salt is built on the opposite assumption.",
  },
  featureBlocks: [],
  closing: {
    title: "If you want the work done while you are out",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            Every alternative above shares one assumption: you are the engine. You design the
            automation, send the chat message, work the CRM, write the prompt, or manage the
            assistant. The tools differ; the assumption does not.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Salt is built on the opposite assumption. The business state comes first, the
            thinking comes from Salt, and the work arrives finished, waiting for your quick
            okay. If you want a tool to use, any of the products above is a reasonable choice.
            If you want the work done while you are out, that is Salt.
          </>
        ),
      },
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
};
