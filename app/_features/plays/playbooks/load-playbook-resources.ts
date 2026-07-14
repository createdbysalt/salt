import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getPlaybookBySlug } from "./schema/v2/discovery";

export type PlaybookResourceCategory = "script" | "reference" | "asset";

export interface PlaybookResource {
  category: PlaybookResourceCategory;
  name: string;
  description: string | null;
  extension: string;
  sizeLabel: string;
  executable: boolean;
  content: string | null;
}

const CATEGORY_DIRS: Record<PlaybookResourceCategory, string> = {
  script: "scripts",
  reference: "references",
  asset: "assets",
};

const EXECUTABLE_EXTENSIONS = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".py",
  ".sh",
  ".rb",
]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".py",
  ".sh",
  ".rb",
  ".json",
  ".yml",
  ".yaml",
]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// Best-effort one-line description: first markdown heading / comment / line.
function extractDescription(filePath: string, extension: string): string | null {
  if (!TEXT_EXTENSIONS.has(extension)) return null;
  try {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 2000);
    for (const raw of head.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const cleaned = line
        .replace(/^#+\s*/, "")
        .replace(/^\/\/+\s*/, "")
        .replace(/^#\s*/, "")
        .replace(/^--\s*/, "")
        .replace(/^\*+\s*/, "")
        .replace(/^>\s*/, "")
        .trim();
      if (!cleaned || cleaned === "---") continue;
      return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
    }
  } catch {
    return null;
  }
  return null;
}

function readTextContent(filePath: string, extension: string): string | null {
  if (!TEXT_EXTENSIONS.has(extension)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.length > 64_000
      ? `${content.slice(0, 64_000)}\n\n[Truncated for preview]`
      : content;
  } catch {
    return null;
  }
}

function readCategory(
  dir: string,
  category: PlaybookResourceCategory,
): PlaybookResource[] {
  const categoryDir = path.join(dir, CATEGORY_DIRS[category]);
  if (!fs.existsSync(categoryDir)) return [];

  return fs
    .readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => {
      const filePath = path.join(categoryDir, entry.name);
      const extension = path.extname(entry.name).toLowerCase();
      let sizeLabel = "";
      try {
        sizeLabel = formatBytes(fs.statSync(filePath).size);
      } catch {
        sizeLabel = "";
      }
      return {
        category,
        name: entry.name,
        description: extractDescription(filePath, extension),
        extension,
        sizeLabel,
        executable: category === "script" && EXECUTABLE_EXTENSIONS.has(extension),
        content: readTextContent(filePath, extension),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadPlaybookResources(slug: string): PlaybookResource[] {
  const playbook = getPlaybookBySlug(slug);
  if (!playbook?.packagePath) return [];

  return [
    ...readCategory(playbook.packagePath, "script"),
    ...readCategory(playbook.packagePath, "reference"),
    ...readCategory(playbook.packagePath, "asset"),
  ];
}
