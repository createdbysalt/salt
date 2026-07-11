import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  runRoutingBenchmark,
  loadRoutablePlaybooks,
  routeInput,
  type RoutingEvalFile,
} from "./routing-eval-runner";

const EVALS_PATH = path.join(__dirname, "evals.json");

describe("routing-evals", () => {
  it("passes all routing eval cases", () => {
    const evalFile = JSON.parse(fs.readFileSync(EVALS_PATH, "utf8")) as RoutingEvalFile;
    const benchmark = runRoutingBenchmark(evalFile.evals);

    for (const result of benchmark.results.filter((r) => !r.passed)) {
      console.error(`  ✗ ${result.eval_id}: ${result.evidence}`);
    }

    expect(benchmark.passed, "routing eval benchmark").toBe(benchmark.total);
  });

  it("excludes keeper playbooks from routing", () => {
    const playbooks = loadRoutablePlaybooks();
    const keeperSlugs = playbooks.filter((p) => p.slug.startsWith("keeper-"));

    expect(keeperSlugs).toHaveLength(0);
  });

  it("returns null for empty playbook list", () => {
    const result = routeInput("send an email to Dana", []);
    expect(result.slug).toBeNull();
    expect(result.score).toBe(0);
  });

  it("requires minimum threshold for a match", () => {
    const playbooks = [
      {
        slug: "invoice-reminder",
        name: "Invoice Reminder",
        whenToUse: "send a reminder about an overdue invoice to a client",
        keywords: new Set(["send", "reminder", "overdue", "invoice", "client"]),
      },
    ];

    const noMatch = routeInput("what time is it", playbooks);
    expect(noMatch.slug).toBeNull();

    const hasMatch = routeInput("send invoice reminder to client", playbooks);
    expect(hasMatch.slug).toBe("invoice-reminder");
  });
});
