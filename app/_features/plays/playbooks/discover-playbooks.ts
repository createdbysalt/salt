import fs from "node:fs";
import path from "node:path";

const PLAYBOOKS_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks");

export interface DiscoveredPlaybook {
  slug: string;
  dir: string;
  playbookPath: string;
  evalsPath: string | null;
}

export function discoverPlaybookDirs(root = PLAYBOOKS_ROOT): DiscoveredPlaybook[] {
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(root, entry.name);
      const playbookPath = path.join(dir, "playbook.md");
      const evalsPath = path.join(dir, "evals.json");
      return {
        slug: entry.name,
        dir,
        playbookPath,
        evalsPath: fs.existsSync(evalsPath) ? evalsPath : null,
      };
    })
    .filter((item) => fs.existsSync(item.playbookPath));
}

export function readPlaybookSource(playbookPath: string): string {
  return fs.readFileSync(playbookPath, "utf8");
}

export function readEvalsFile(evalsPath: string): string {
  return fs.readFileSync(evalsPath, "utf8");
}
