/** Placeholder titles used when creating blank records from list "Add" actions. */
export const PLACEHOLDER_RECORD_NAMES = new Set([
  "untitled",
  "untitled organization",
  "untitled work",
  "untitled meeting",
  "untitled file",
]);

export const PLACEHOLDER_FILE_URL = "https://pending.usesalt.io";

export function normalizeRecordName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isPlaceholderRecordName(name: string): boolean {
  return PLACEHOLDER_RECORD_NAMES.has(normalizeRecordName(name).toLowerCase());
}

export function validateRecordName(name: string):
  | { ok: true; name: string }
  | { ok: false; message: string } {
  const normalized = normalizeRecordName(name);
  if (!normalized) {
    return { ok: false, message: "Name is required" };
  }
  if (isPlaceholderRecordName(normalized)) {
    return { ok: false, message: "Replace the placeholder with a real name" };
  }
  return { ok: true, name: normalized };
}

export function validateFileLinkUrl(url: string):
  | { ok: true; url: string }
  | { ok: false; message: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, message: "Link URL is required" };
  }
  if (trimmed.toLowerCase() === PLACEHOLDER_FILE_URL.toLowerCase()) {
    return { ok: false, message: "Replace the placeholder link with a real URL" };
  }
  try {
    new URL(trimmed);
  } catch {
    return { ok: false, message: "Enter a valid URL" };
  }
  return { ok: true, url: trimmed };
}
