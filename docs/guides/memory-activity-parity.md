# Memory Record Activity Parity

**Status:** Active convention  
**Applies to:** Work, People, Orgs — any Memory detail **Overview** tab + **Activity** tab pair

## Rule

Every user-visible or Salt-maintained change on a Memory record **must** appear in that record's **Activity** timeline — not only on Overview.

If you add an Overview section, inline field, or sidebar card that mutates record state, ship Activity support in the **same PR** unless the surface is explicitly read-only with no history (e.g. derived progress %).

## Work (reference implementation)

| Overview surface | Activity source | Mapper / query |
|------------------|-----------------|----------------|
| Details fields (status, stage, pricing, …) | `profile_field_provenance` | `mapWorkProvenanceToActivity` → `getWorkActivity` |
| Lifecycle (relationship, status transitions) | `lifecycle_events` | `mapLifecycleEventToTimelineEntry` → `mergeActivityTimeline` |
| **Health** (score/band changes) | `lifecycle_events` (`health_change`) | `logHealthChangeLifecycleEvent` in `*/health/recompute.ts` |
| AI summary refresh | Cached narrative timestamp | `buildNarrativeActivityTimelineEntry` |
| **Blockers** | `work_blockers` (all statuses) | `mapBlockerToActivityEntries` → `getWorkSupplementalActivity` |
| **Tags** | `entity_tag_assignments` | `mapTagAssignmentToActivityEntry` → `getWorkSupplementalActivity` |

**Integration point:** `getWorkDetailData` → `lifecycleEvents` + `supplementalActivity` → `WorkActivityTab` → `mergeActivityTimeline`.

## Health changes

When health is recomputed and **score or band** changes, log a `health_change` row via `app/_features/memory/health/log-health-lifecycle-event.ts` from:

- `app/_features/work/health/recompute.ts` (`entity_type: work`)
- `app/_features/people/health/recompute.ts` (`entity_type: person`)
- `app/_features/orgs/health/recompute.ts` (`entity_type: organization`)

Activity tabs already merge `lifecycleEvents` — no separate supplemental mapper needed for health.

## Checklist for new Overview surfaces

When adding a section or editable field:

1. **Persist with timestamps** — table rows need `created_at` / `updated_at` / `resolved_at` (or provenance `set_at`) so events sort correctly.
2. **Add a mapper** — pure function in `app/_features/<feature>/utils/activity.ts` returning `ProfileActivityTimelineEntry[]` (one row can emit multiple events, e.g. create + resolve).
3. **Fetch in supplemental query** — extend `getWorkSupplementalActivity` (work) or equivalent for people/orgs.
4. **Wire the Activity tab** — pass into `mergeActivityTimeline` via `supplementalActivity` (work) or merge in the entity's activity query.
5. **Update empty copy** — Activity tab helper/empty text should mention the new event types if users would expect to see them.
6. **Test the mapper** — co-located `*.test.ts` for label/detail/kind behavior (no DB required).

## Provenance vs supplemental

- **Profile fields** saved through the provenance pipeline → automatic Activity via `profile_field_provenance` + `map*ProvenanceToActivity`. Prefer this for scalar Overview fields.
- **Structured entities** (blockers, tags, milestones, connections, notes) → supplemental mappers + query until/unless they write provenance rows.

## Known gaps (fix when touching the surface)

- Tag **removal** is not in Activity today (`entity_tag_assignments` deletes on unassign). Add an audit/event row or soft-delete if removal history matters.
- People/Org Activity do not yet use `getWorkSupplementalActivity`-style supplemental feeds for tags/blockers — align when those surfaces ship on person/org Overview.

## Files to touch (work)

```
app/_features/work/utils/activity.ts      # mappers
app/_features/work/utils/activity.test.ts # unit tests
app/_features/work/queries.ts             # getWorkSupplementalActivity, getWorkDetailData
app/_features/work/components/WorkActivityTab.tsx
app/_features/work/types.ts               # WorkDetailData.supplementalActivity
```
