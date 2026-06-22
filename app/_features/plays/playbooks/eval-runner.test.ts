import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runPlaybookBenchmark } from "./eval-runner";
import { parsePlaybookMarkdown } from "./parse-playbook";
import type { PlaybookEvalFile } from "./types";

describe("runPlaybookBenchmark", () => {
  it("passes all reference playbook eval suites", () => {
    const slugs = ["quiet-lead-nudge", "overdue-invoice-reminder", "meeting-recap"];

    for (const slug of slugs) {
      const dir = path.join(process.cwd(), "app/_features/plays/playbooks", slug);
      const parsed = parsePlaybookMarkdown(
        fs.readFileSync(path.join(dir, "playbook.md"), "utf8"),
        slug,
      );
      const evalFile = JSON.parse(
        fs.readFileSync(path.join(dir, "evals.json"), "utf8"),
      ) as PlaybookEvalFile;

      const benchmark = runPlaybookBenchmark({
        playbook_slug: slug,
        version: 1,
        definition: parsed.definition,
        evals: evalFile.evals,
      });

      expect(benchmark.passed, `${slug} benchmark`).toBe(benchmark.total);
    }
  });
});
