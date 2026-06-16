import type { CompareHiddenCostsConfig } from "../types";

/** Lindy pricing friction points — aligned with compare narrative and public reviewer themes. */
export const saltVsLindyHiddenCosts: CompareHiddenCostsConfig = {
  heading: "Hidden Costs",
  items: [
    {
      title: "Credit overages",
      body: "Plans include a fixed monthly credit pool. Heavy usage, retries, and debugging can burn through credits before the month ends — then agents pause until the next cycle or you buy more.",
    },
    {
      title: "Premium actions",
      body: "Many useful workflows rely on premium actions. Reviewers say the free tier is too limited to evaluate what you would actually run day to day.",
    },
    {
      title: "Failed runs still cost",
      body: "When an agent errors, loops, or misfires, those runs still consume credits even when no useful work gets done.",
    },
    {
      title: "Per-agent setup",
      body: "Each new workflow means picking triggers, connecting tools, and tuning prompts. That builder time does not show up on the invoice, but it is real labor.",
    },
    {
      title: "Unpredictable monthly total",
      body: "The listed plan price is a floor. G2 reviewers frequently cite credits as the reason the real monthly cost is hard to forecast.",
    },
    {
      title: "Experimentation tax",
      body: "Because every test run spends credits, teams often hesitate to iterate — the opposite of what you want from a tool meant to save time.",
    },
  ],
};
