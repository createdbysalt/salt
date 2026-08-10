/**
 * Read all files from a playbook package directory.
 * Returns structured data for the Advanced tab UI.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, relative } from "path";
import { parse as parseYaml } from "yaml";

export interface PackageFile {
  name: string;
  path: string;
  type: "yaml" | "md" | "ts" | "json" | "other";
  exists: boolean;
  content?: string;
}

export interface PackageData {
  files: PackageFile[];
  signals: string[];
  fields: string[];
  ruleCount: number;
  references: Array<{ name: string; path: string }>;
}

export function readPackageData(packagePath: string): PackageData | null {
  if (!existsSync(packagePath)) {
    return null;
  }

  const files: PackageFile[] = [];
  const references: Array<{ name: string; path: string }> = [];

  // Scan for files
  const scanDir = (dir: string, prefix: string = "") => {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = prefix ? `${prefix}/${entry}` : entry;
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath, relativePath);
      } else {
        const ext = entry.split(".").pop() || "";
        const type = ext === "yaml" || ext === "yml" ? "yaml"
          : ext === "md" ? "md"
          : ext === "ts" ? "ts"
          : ext === "json" ? "json"
          : "other";

        // Read file content for viewable types
        let content: string | undefined;
        if (type !== "other") {
          try {
            content = readFileSync(fullPath, "utf-8");
          } catch {
            // Ignore read errors
          }
        }

        files.push({
          name: entry,
          path: relativePath,
          type,
          exists: true,
          content,
        });

        // Track references
        if (relativePath.startsWith("references/")) {
          references.push({
            name: entry.replace(/\.[^.]+$/, ""),
            path: relativePath,
          });
        }
      }
    }
  };

  scanDir(packagePath);

  // Read definition.yaml for signals, fields, rules
  let signals: string[] = [];
  let fields: string[] = [];
  let ruleCount = 0;

  const definitionPath = join(packagePath, "definition.yaml");
  if (existsSync(definitionPath)) {
    try {
      const content = readFileSync(definitionPath, "utf-8");
      const def = parseYaml(content);

      if (def.policy?.signals) {
        signals = def.policy.signals;
      }
      if (def.policy?.fields) {
        fields = def.policy.fields;
      }
      if (def.policy?.fill_rules) {
        ruleCount = def.policy.fill_rules.length;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    files,
    signals,
    fields,
    ruleCount,
    references,
  };
}
