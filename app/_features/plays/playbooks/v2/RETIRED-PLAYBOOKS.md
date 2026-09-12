# Retired Playbooks

Record of playbook packages that previously shipped in this catalog but were
pulled from the product. Discovery is directory-based, so removing the package
directory removes the playbook from the library **and** stops all trigger
dispatch / scheduled execution for it.

## 2026-09-08 — Pre-launch catalog trim

After the Small-Business Playbook Rollout (the "Crucial 6", see
`docs/plans/` and the invoice-reminder exemplar), we trimmed the visible
catalog to only the playbooks we stand behind at full depth. Everything below
was removed from the repo on this date — not visible to users, not dispatching,
not creating play runs.

**Kept (the current catalog):**

| Section | Playbook | Slug |
|---|---|---|
| billing | Invoice Reminder | `invoice-reminder` |
| billing | Payment Received | `payment-received` |
| billing | Cash Forecast | `cash-runway` |
| work | Contract Review | `contract-review` |
| me | Weekly Briefing | `weekly-briefing` |
| relationships | Lead Follow-Up | `lead-follow-up` |
| relationships | Customer Pulse | `customer-pulse` |
| communication | Complaint Response | `complaint-response` |

**Removed on 2026-09-08:**

| Section | Playbook | Slug | Notes |
|---|---|---|---|
| billing | Contract Renewal Alert | `contract-renewal-alert` | Definition-only (no PLAYBOOK.md / evals) |
| billing | Payment Reconciliation | `payment-reconciliation` | Definition-only |
| communication | Email Digest | `email-digest` | Also removed: `/api/cron/email-digest` route, `vercel.json` cron entry, `app/_features/capture/services/email-digest-cron.ts` |
| communication | Email Triage | `email-triage` | Also removed: `app/_features/capture/services/email-triage-hook.ts` + its call site in `enrichment-pipeline.ts` |
| me | Getting Started | `getting-started` | Onboarding system playbook; was already UI-hidden in `PlaybookTabV2.tsx` |
| me | Create Your First Playbook | `create-first-playbook` | Onboarding system playbook; was already UI-hidden |
| meetings | Meeting Prep | `meeting-prep` | Package dir was `meetings/prep/` |
| meetings | Meeting Recap | `meeting-recap` | Package dir was `meetings/recap/` |
| relationships | Follow-up | `follow-up` | |
| relationships | Relationship Health | `relationship-health` | Package dir was `relationships/health/` |
| relationships | Upsell Opportunity | `upsell-opportunity` | Definition-only |
| work | Blocker Watch | `blocker-watch` | |

**Intentionally left in place (harmless, needed for history):**

- `app/_features/plays/lib/play-headline.ts` — headline strings for
  `contract-renewal-alert`, `upsell-opportunity`, `meeting-prep` etc. still
  render historical `play_runs` rows in Activity.
- The `HIDDEN_PLAYBOOK_SLUGS` filter in `PlaybookTabV2.tsx` — still lists
  `getting-started` / `create-first-playbook` so a DB-defined fork can't
  reappear in the library.
- `executor.test.ts` / `earned-autonomy.test.ts` / `run-stats.test.ts` use
  these slugs as inline string fixtures only — no disk dependency.

**Known leftovers to verify:**

- `playbook_definitions` DB rows: **verified clean on 2026-09-08** — 0 rows
  (`scripts/dump-playbook-definitions.ts`). The DB-only `new-lead-intake` /
  `expense-categorization` rows from the rollout plan's Phase 0 were already
  retired, so nothing in the DB can shadow or re-add a removed slug.
- Dev scripts referencing removed slugs (not part of the build):
  `scripts/setup-demo-account.ts`, `scripts/smoke-rate-card.mts`,
  `scripts/smoke-dismiss-paused.mts`, `scripts/smoke-agent-play-modal.mts`,
  `scripts/smoke-autonomy.mts`.

**To restore a playbook:** revert the removal commit, or restore the package
directory from git history under `app/_features/plays/playbooks/v2/<section>/<slug>/`.
For Email Digest / Email Triage also restore the cron route/service/hook files
listed above.
