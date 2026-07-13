type ProfileNameRow = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  preferred_name?: string | null;
};

function isEmailLike(value: string, email?: string | null): boolean {
  if (email && value === email) return true;
  return value.includes("@");
}

/** Hero / greeting name — never show a raw email when a human name exists. */
export function operatorDisplayName(profile: ProfileNameRow | null | undefined): string {
  if (!profile) return "You";

  const display = profile.display_name?.trim();
  if (display && !isEmailLike(display, profile.email)) {
    return display;
  }

  const fromParts = [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (fromParts) return fromParts;

  const fullName = profile.full_name?.trim();
  if (fullName && !isEmailLike(fullName, profile.email)) {
    return fullName;
  }

  return profile.email?.split("@")[0] || "You";
}

/** First name for greetings — prefers Me → Preferred name, then Full name, then profile fallbacks. */
export function operatorGreetingName(profile: ProfileNameRow | null | undefined): string {
  const preferred = profile?.preferred_name?.trim();
  if (preferred && !isEmailLike(preferred, profile?.email)) {
    return preferred;
  }

  const editableFull = operatorEditableFullName(profile);
  if (editableFull) {
    const first = editableFull.split(/\s+/).filter(Boolean)[0];
    if (first) return first;
  }

  const firstName = profile?.first_name?.trim();
  if (firstName && !isEmailLike(firstName, profile?.email)) {
    return firstName;
  }

  const display = operatorDisplayName(profile);
  if (display !== "You") {
    const first = display.split(/\s+/).filter(Boolean)[0];
    if (first && !isEmailLike(first, profile?.email)) {
      return first;
    }
  }

  const emailLocal = profile?.email?.split("@")[0];
  if (emailLocal) return emailLocal;

  return "there";
}

/** Full display name for avatars and labels — mirrors Me → Full name when set. */
export function operatorProfileFullName(profile: ProfileNameRow | null | undefined): string {
  const editableFull = operatorEditableFullName(profile);
  if (editableFull) return editableFull;

  const display = operatorDisplayName(profile);
  if (display !== "You") return display;

  return profile?.email?.split("@")[0] || "You";
}

/** Editable Full name field — only the user-set display_name, never computed email fallback. */
export function operatorEditableFullName(
  profile: ProfileNameRow | null | undefined,
): string {
  const display = profile?.display_name?.trim() ?? "";
  if (!display || isEmailLike(display, profile?.email)) {
    return "";
  }
  return display;
}

export function splitFullName(fullName: string): {
  firstName: string | null;
  lastName: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
