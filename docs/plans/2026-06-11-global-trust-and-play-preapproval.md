# Plan: Global Trust Switch & Play-Level Pre-Approval
**Date:** 2026-06-11
**Status:** In Progress — Part 1 shipped + Part 2 contract shipped (2026-06-11 PM).
Built: migration 20260612001000 (workspaces.trust_level + backfill, play_templates
required/approved actions, audit source 'play'); getWorkspaceTrustLevel +
global trustByProvider in getWorkspaceConnectorPolicy; updateWorkspaceTrustLevel
action; Settings → Connectors "What Salt is allowed to do" switch; per-connector
trust pills removed from ConnectorDetailModal (email mode kept, gated on global
trust); executeComposioAction play context (assertComposioToolAllowed play
approval check, approval-card bypass for play-approved slugs, source 'play');
5 regression tests in tool-policy.test.ts.
REMAINING: drop legacy workspace_integrations.trust_level (follow-up migration
after bake time); Part 2 consent UX at play activation + play-run executor
(blocked on the acting-Plays engine); open questions below.

## Context

Founder decisions (2026-06-11 evening session):

1. **Trust level becomes workspace-global.** Today `trust_level` lives per
   connector row (`workspace_integrations.trust_level`) with a toggle in each
   connector detail modal. That overlaps confusingly with the per-tool
   disable/allow toggles. The per-connector switch goes away; ONE switch in
   Settings ("Salt can act with approval" / "Salt only reads") governs every
   connector.
2. **Per-tool disable/allow toggles stay** as the fine-grained layer in the
   connector modals. They already enforce at registration + execution
   (verified 2026-06-11).
3. **Plays carry pre-approval.** Enabling a Play that contains acting steps
   records the user's consent for exactly those actions; play steps then run
   without per-action approval cards. Approval moves from per-action to
   per-Play — this IS the "earned autonomy" product story (GROW).

Non-negotiable invariants (unchanged):
- Destructive-class tools stay unreachable everywhere, including inside Plays.
- Every execution lands in `workspace_tool_executions` (audit log) — play-run
  executions record the play as approval context.
- Ask Salt chat keeps per-action approval cards (chat is not a pre-approved Play).
- Email draft/send mode stays per-workspace as-is.

## Research Summary

- `trust_level` column: `workspace_integrations.trust_level`
  (migration 20260611100000), read by `loadProviderSettings` →
  `getWorkspaceConnectorPolicy` (`app/_features/connectors/queries.ts`) →
  `trustByProvider` consumed in `isAskSaltSlugAllowed`
  (`app/_lib/composio/ask-salt-tools.ts`).
- Trust toggle UI: connector detail modal (`updateConnectorTrustSettings` in
  `app/_features/connectors/actions.ts`).
- Plays execution today: ONLY `first-scan.ts` (read-class, unattended,
  hard-blocked from mutating tools by `assertComposioToolAllowed`'s
  `unattended` flag). There is **no acting-step engine yet** — Part 2 defines
  the contract that engine must be built against.
- Parallel work warning: the Stripe-connector refactor (2026-06-11) touched
  the same files (`connector-capabilities.ts`, `queries.ts`, `actions.ts`,
  `ConnectorsPage.tsx`). Rebase/sync before starting.

## Implementation Plan

> Each step includes its tool in `[brackets]`. Frontend work MUST use
> `/frontend-design` (read DESIGN.md first).

### Part 1: Global trust switch (contained)
- [ ] Migration: `workspaces.trust_level` (`read_only` | `act_with_approval`,
  default `read_only`). Backfill: `act_with_approval` if ANY of the
  workspace's integration rows has it (most-permissive wins — the user set it
  deliberately). Keep the old column until Part 1 ships, then drop in a
  follow-up migration. `[tool: /database migration]`
- [ ] `getWorkspaceConnectorPolicy`: read the workspace-level value; return a
  single `trustLevel` instead of `trustByProvider` (or populate every
  provider with the global value for a smaller diff — decide at build time).
  `[tool: direct edit]`
- [ ] `isAskSaltSlugAllowed` + tests: consume global trust. `[tool: direct edit + /testing-patterns]`
- [ ] Settings UI: one trust switch on the workspace Settings surface, with
  plain-language copy ("Salt can prepare and take actions — each one needs
  your approval" / "Salt only reads"). `[tool: /frontend-design]`
- [ ] Remove the trust toggle from the connector detail modal (keep per-tool
  toggles + Gmail email mode). Update `updateConnectorTrustSettings` →
  workspace-level action. `[tool: /frontend-design, /ds-check]`
- [ ] E2E selector sync for any moved/renamed controls. `[tool: /webapp-testing]`

### Part 2: Play-level pre-approval (design + build)
- [ ] Play definitions declare `requiredActions: string[]` (Composio tool
  slugs from the allowlist; validated against tool-policy — destructive slugs
  rejected at definition time). `[tool: direct edit]`
- [ ] Migration: play activation/enrollment records consent —
  `approved_actions jsonb`, `approved_by`, `approved_at` on the workspace's
  play enrollment row. Re-consent required when a play version adds new
  actions. `[tool: /database migration]`
- [ ] Consent UX at play activation: show the play's actions using the same
  capability language as connector consent ("This play will: create calendar
  events, draft emails…"). Approval = enabling the play. `[tool: /scout, /frontend-design]`
- [ ] Execution contract: a play-run executor calls `executeComposioAction`
  with a new context `{ source: "play", playEnrollmentId }`;
  `assertComposioToolAllowed` allows mutating slugs **iff** the slug is in
  the enrollment's `approved_actions` AND workspace trust is
  `act_with_approval` AND the tool isn't workspace-disabled. Destructive:
  always rejected. Unattended read-only guard stays for first-scan.
  `[tool: direct edit + /testing-patterns]`
- [ ] Audit log: play executions record `source: "play"` and
  `approved_by` = the user who enabled the play (consent provenance).
  `[tool: direct edit]`
- [ ] Kill switch: pausing/disabling a play immediately stops its acting
  steps (enrollment status checked at execution time, not cached).
  `[tool: direct edit]`
- [ ] Regression tests: play can't run a tool outside its approved list; play
  can't run anything at read_only trust; destructive never runs; disabled
  tools blocked even when play-approved. `[tool: /testing-patterns]`

## Files to Create/Modify

| File | Action | Purpose | Tool |
|------|--------|---------|------|
| `supabase/migrations/<ts>_workspace_trust_level.sql` | Create | Global trust column + backfill | `/database migration` |
| `app/_features/connectors/queries.ts` | Modify | Global trust in policy load | — |
| `app/_lib/composio/ask-salt-tools.ts` | Modify | Global trust consumption | — |
| `app/_features/connectors/actions.ts` | Modify | Trust action → workspace level | — |
| Connector detail modal components | Modify | Remove per-connector trust toggle | `/frontend-design` |
| Settings surface (workspace settings) | Modify | Add global trust switch | `/frontend-design` |
| `app/_lib/composio/actions.ts` | Modify | Play execution context + checks | — |
| Plays schema + enrollment migration | Create | Pre-approval consent storage | `/database migration` |
| `app/_lib/composio/tool-policy.test.ts` | Modify | Part 2 regression tests | `/testing-patterns` |

## Open Questions

- Where does the global switch live: existing Settings page section, or HQ
  "Salt autonomy" card? (`/scout` for placement patterns.)
- Play versioning: when a play definition gains a new action, does the play
  pause until re-consent, or run with only previously-approved actions?
  (Recommend: pause + nudge.)
- Does Part 2 ship before or with the first acting Play? (Contract can land
  test-covered with no UI until a play uses it.)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Parallel Stripe-refactor edits in the same files | Sync/rebase first; Part 1 is small — land it in one sitting |
| Backfill surprises users (acting suddenly enabled globally) | Most-permissive backfill only if a connector already had it; release note in-app |
| Play pre-approval becomes a prompt-injection target (play args steered) | Approved actions are SLUGS, not args; arg validation (Zod) still runs; audit log keeps full args; consider per-play arg constraints later |
| Dropping `workspace_integrations.trust_level` breaks old reads | Two-phase: ship global reads first, drop column in follow-up migration |
