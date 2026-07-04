type ProfileNameRow = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
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
