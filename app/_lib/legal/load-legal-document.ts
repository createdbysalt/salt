import { readFileSync } from "node:fs";
import { join } from "node:path";

const LEGAL_DIR = join(process.cwd(), "brand-identity/legal");

export type LegalDocumentSlug =
  | "website-terms-of-use"
  | "early-access-terms"
  | "privacy-policy"
  | "cookie-policy"
  | "subprocessors"
  | "disclaimer"
  | "dpa";

export function loadLegalDocument(slug: LegalDocumentSlug): string {
  return readFileSync(join(LEGAL_DIR, `${slug}.md`), "utf8");
}
