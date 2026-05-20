---
name: grep-loop-review-workflow
description: Autonomous Greptile review-fix loop. Use on qreview — fetch comments via MCP, fix, test, push, re-fetch, repeat until clean (max 5 rounds). Do not stop after one pass unless blocked or done.
---

# Grep Loop Review Workflow

Autonomous review-fix loop: fetch feedback → fix → verify → push → re-fetch → repeat until done.

**Trigger:** `qreview` (optionally `qreview PR 171` or `qreview no-push` to skip push).

**Source:** [micky-podcast-agentic-engineering](https://github.com/pawel-cell/micky-podcast-agentic-engineering/blob/main/skills/grep-loop-review-workflow/SKILL.md)

---

## Autonomous loop protocol (MANDATORY on `qreview`)

When this skill is invoked, **run the full loop in one session**. Do not stop after a single fetch/fix pass unless an exit condition below is met.

### Defaults

| Setting | Default | Override |
|---------|---------|----------|
| Max rounds | **5** | User says `qreview max 3` |
| Push fixes | **Yes** — commit + push each round with fixes | User says `qreview no-push` |
| Stop after one pass | **Never** | Only on exit conditions |
| Ask user mid-loop | **Only when blocked** | Never for "should I continue?" |

### Each round — print status first

Start every round with a one-line header:

```
qreview — Round N/5 | PR #<num> | <branch> | unaddressed: <count or unknown>
```

### Round steps (repeat)

1. **`list_merge_request_comments`** — `simcoe-house/salt`, `github`, `main`, `prNumber`. Filter: `greptileGenerated: true`, `addressed: false`. If MCP unavailable, use `gh pr view` / pasted comments and continue.
2. **`list_custom_context`** — once on round 1 (org patterns from CLAUDE.md files).
3. **If zero unaddressed comments** → run verification (step 6) → **DONE** (success exit).
4. **Read diff** — `gh pr diff <num>` or `git diff main...HEAD` before editing.
5. **Fix** — only real, relevant issues. Skip false positives; note skipped items in summary.
6. **Verify** — `pnpm test` and/or scoped test + `pnpm lint --fix` on touched areas. On failure, fix and re-run (same round).
7. **Commit + push** (unless `no-push`) — one commit per round: `fix(review): address Greptile round N feedback on PR #<num>`.
8. **`trigger_code_review`** — after push, re-trigger Greptile (`prNumber` + `simcoe-house/salt`). Wait ~60s or poll comments once before next round.
9. **Next round** — go to step 1. **Do not ask the user to continue.**

### Exit conditions (only reasons to stop)

| Condition | Action |
|-----------|--------|
| Zero unaddressed Greptile comments + tests/lint pass | **Success** — print resolved-items summary |
| Hit max rounds (5) with comments remaining | **Partial** — list remaining items; suggest `qreview` again or split PR |
| Human decision needed (product/architecture dispute) | **Blocked** — state question; stop |
| Greptile MCP + gh both unavailable | **Blocked** — ask user to paste comments or fix MCP |
| PR too large (>500 changed files or user said split) | **Blocked** — suggest split; do not loop |

### Final summary (required)

```md
## qreview complete — Round N/5

**Status:** success | partial | blocked
**PR:** #<num> on <branch>
**Fixed:** (bulleted list)
**Skipped (false positive / out of scope):** (bulleted list)
**Remaining:** (if partial)
**Tests:** pass | fail (details)
```

---

## Greptile MCP (this repo)

Requires `GREPTILE_API_KEY` + Cursor launched via `op run --env-file=.env.1password -- open -a Cursor .`

| Parameter | Value |
|-----------|--------|
| `name` | `simcoe-house/salt` (**lowercase**) |
| `remote` | `github` |
| `defaultBranch` | `main` |
| `prNumber` | e.g. `171` |

Tools: `list_merge_request_comments`, `list_custom_context`, `trigger_code_review`.

Docs: [greptile.com/docs/mcp/tools](https://www.greptile.com/docs/mcp/tools) · Setup: `docs/guides/greptile-setup.md`

---

## Pre-flight (round 0, before loop)

Run silently unless blocking:

1. Resolve PR number from branch (`gh pr view --json number`) or user message.
2. If changed files > 500, warn and suggest split — **stop** unless user insists.
3. Confirm on correct branch (`git branch --show-current`).

Do **not** ask "should I start the loop?" — `qreview` means start immediately.

---

## Fix rules

1. Read diff before editing.
2. Fix only substantive issues (correctness, security, maintainability).
3. No drive-by refactors unrelated to review comments.
4. Add/update tests when fixing bugs.
5. Match project conventions (`CLAUDE.md`, nested rules).

---

## When NOT to use

- Massive PRs without willingness to split
- Vague product decisions in review comments
- No objective verification possible (no tests, no lint)

---

## Verification checklist (agent self-check before DONE)

- [ ] Ran full loop protocol (not single pass)
- [ ] Printed round headers
- [ ] Pushed fixes (unless `no-push`)
- [ ] Re-fetched comments after push
- [ ] Final summary with fixed / skipped / remaining
