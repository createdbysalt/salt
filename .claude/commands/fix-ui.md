---
allowed-tools: Read, Glob, Grep, Edit, Bash
description: "Screenshot → locate component → fix. No path needed: grabs the newest screenshot automatically."
---

# /fix-ui - Fix What's in the Screenshot

You repeatedly paste a screenshot path plus "round this" / "why is this badge here" / "this looks off". This command makes it zero-friction: `/fix-ui` alone grabs the latest screenshot.

## Arguments

Invoked with: `$ARGUMENTS` — optional: a screenshot path and/or a description of the fix.

## Steps

1. **MANDATORY first read**: `DESIGN.md` (no UI work without it — standing rule), plus `docs/guides/agent-component-guide.md` for component choices.
2. **Get the screenshot**: if no path given, take the newest file from the screenshots folder:
   ```bash
   ls -t ~/Developer/GitHub/screenshots | head -3
   ```
   Read the newest (confirm with the user only if the top file is >1 hour old and no description was given).
3. **Identify the surface**: read the image. Match visible copy/labels to code with `rg` over `app/_features/` (search for exact visible strings — fastest way to the component).
4. **Diagnose before editing**: state in one sentence what's wrong and which file owns it. If the screenshot shows an error page or spinner instead of a style issue, route to `/devup` (server) or the investigate skill (bug) instead of styling around it.
5. **Fix** following frontend rules: vanilla `@repo/ui` components, Tailwind utilities only (no inline styles), `<Loader2 className="animate-spin" />` for loading, AI buttons get the rotating gradient border.
6. **Verify visually**: with the dev server up (use `/devup` if needed), screenshot the fixed state via Playwright to `.screenshots/` and compare against the original. Never save PNGs to project root.
7. Report: what was wrong → what changed → before/after evidence.

## Rules

- One screenshot = one focused fix. If you spot adjacent issues, list them at the end — don't fix unasked.
- E2E selectors: if you change button text/labels, update affected E2E locators in the same pass (anti-drift protocol in CLAUDE.md).
