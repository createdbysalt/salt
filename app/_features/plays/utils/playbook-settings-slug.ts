/**
 * Maps v2 playbook slugs to persisted blueprint slugs in profile_playbook_settings.
 *
 * The unified memory-records playbook replaces all per-entity-type keeper playbooks.
 * Old slugs are mapped to memory-records for backward compatibility.
 */
const V2_TO_SETTINGS_BLUEPRINT_SLUG: Record<string, string> = {
  // Old per-entity-type slugs → unified memory-records
  "people-records": "memory-records",
  "keeper-people-records": "memory-records",
  "keeper-organizations-records": "memory-records",
  "keeper-work-records": "memory-records",
  "keeper-billing-records": "memory-records",
  "keeper-files-records": "memory-records",
  "keeper-meetings-records": "memory-records",
  "relationships-keeper": "memory-records",
  "convos-keeper": "memory-records",
};

export function resolvePlaybookSettingsSlug(playbookSlug: string): string {
  return V2_TO_SETTINGS_BLUEPRINT_SLUG[playbookSlug] ?? playbookSlug;
}
