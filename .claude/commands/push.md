---
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep
description: "Commit and push with branch-state awareness. '/push', '/push staging', '/push status' — replaces the 'commit and push' + 'what's on staging?' message pair."
---

# /push - Commit, Push, and Know Where Things Are

"commit and push" was typed 6+ times in June 2026, usually followed by "what of this is on staging?". This command does both in one shot.

## Arguments

Invoked with: `$ARGUMENTS`

Modes: *(none)* = commit + push current branch · `staging` = commit + push + get it onto staging · `status` = report only, no mutations

## Mode: default (commit + push)

1. `git status` + `git diff` — review what changed. Group into **atomic conventional commits** (`feat(scope):`, `fix(scope):`, `chore(scope):` — match recent `git log` style).
2. Never stage: `.env*` files, secrets, `.scratch/` contents, screenshots in project root. If found, flag instead of committing.
3. Commit with the harness-required trailer (Co-Authored-By line).
4. Push the current branch. If on `main`, STOP and ask — work happens on feature branches.
5. Finish with the **branch-state report** (below) so the follow-up question is pre-answered.

## Mode: `staging`

Everything in default mode, then:
1. If current branch IS `staging`: done after push.
2. If on a feature branch: push it, then check for an open PR to `staging` (`gh pr list --head <branch> --base staging`). Update it if exists; otherwise create one (`gh pr create --base staging`) with a body summarizing the commits. PR bodies end with the standard generation footer.
3. Report the PR URL.

## Mode: `status`

No mutations. Produce the branch-state report only.

## Branch-State Report (always end with this)

```bash
git fetch origin --quiet
git log --oneline @{u}..HEAD        # unpushed commits
git log --oneline origin/staging..HEAD -- 2>/dev/null | head -20   # on this branch, not on staging
git log --oneline origin/main..origin/staging | head -20           # on staging, not on main
```

Present as three short lists: **Unpushed** / **Not on staging yet** / **Staging ahead of main**. Plain English, no hash dumps beyond the one-liners.

## Rules

- Atomic commits — one logical change each. Split unrelated work.
- Never force-push. Never push to `main` directly.
- If pre-push hooks or CI fail, report the failure output verbatim — don't bypass.
