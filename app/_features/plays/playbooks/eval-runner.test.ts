import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runPlaybookBenchmark } from "./eval-runner";
import { discoverPlaybookDirs, readPlaybookSource, readEvalsFile } from "./discover-playbooks";
import { parsePlaybookMarkdown } from "./parse-playbook";
import type { PlaybookEvalFile } from "./types";

describe("runPlaybookBenchmark", () => {
  it("passes all discovered acting playbook eval suites", () => {
    const discovered = discoverPlaybookDirs();

    for (const item of discovered) {
      if (!item.evalsPath) continue;

      const parsed = parsePlaybookMarkdown(readPlaybookSource(item.playbookPath), item.slug);
      if (parsed.frontmatter.kind !== "acting") continue;

      const evalFile = JSON.parse(readEvalsFile(item.evalsPath)) as PlaybookEvalFile;

      const benchmark = runPlaybookBenchmark({
        playbook_slug: item.slug,
        version: 1,
        definition: parsed.definition,
        evals: evalFile.evals,
      });

      expect(benchmark.passed, `${item.slug} benchmark`).toBe(benchmark.total);
    }
  });
});
