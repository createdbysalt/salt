---
name: design-sync
description: "Sync DESIGN.md with actual CSS tokens from globals.css. Run after visual changes."
---

# /design-sync — Keep DESIGN.md Up to Date

> **Inactive during Lovable migration.** [`DESIGN.md`](../../DESIGN.md) is a stub until Phase 2 captures Lovable tokens. Do not run full sync until post-capture. See [lovable-ui-migration.md](../../docs/plans/2026-06-01-lovable-ui-migration.md).

Synchronize DESIGN.md with the actual design tokens in `app/globals.css`. Run this after making visual changes to ensure AI agents generate on-brand UI.

## Usage

```bash
# Full sync — extract tokens from globals.css and update DESIGN.md
/design-sync

# Audit only — check for drift without updating
/design-sync --audit

# Specific section
/design-sync colors
/design-sync typography
/design-sync spacing
```

## What It Does

1. **Reads** `app/globals.css` for current token values
2. **Compares** against DESIGN.md YAML front matter
3. **Reports** any drift (changed values, new tokens, removed tokens)
4. **Updates** DESIGN.md to match current CSS (unless `--audit`)

## When to Run

- After changing colors in `globals.css`
- After adding new design tokens
- After modifying typography or spacing scales
- Before major demos or reviews
- Weekly as part of design system hygiene

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      /design-sync                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. EXTRACT TOKENS                                          │
│     • Parse globals.css for CSS custom properties           │
│     • Extract colors, typography, spacing, radius           │
│                                                             │
│  2. COMPARE                                                 │
│     • Diff against DESIGN.md YAML front matter              │
│     • Flag: changed values, new tokens, missing tokens      │
│                                                             │
│  3. REPORT                                                  │
│     • Show what changed                                     │
│     • Highlight breaking changes (color shifts, etc.)       │
│                                                             │
│  4. UPDATE (unless --audit)                                 │
│     • Update YAML front matter with new values              │
│     • Preserve markdown prose sections                      │
│     • Update "Last synced" timestamp                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Example Output

```
/design-sync

═══════════════════════════════════════════════════════════════
DESIGN.MD SYNC
═══════════════════════════════════════════════════════════════

Comparing globals.css → DESIGN.md...

CHANGES DETECTED:
───────────────────────────────────────────────────────────────
  colors.accent: "#7C3AED" → "#8B5CF6"  (purple shifted lighter)
  spacing.10: (new) "40px"
  typography.body.lineHeight: (missing in DESIGN.md)

UNCHANGED: 23 tokens

───────────────────────────────────────────────────────────────

✓ Updated DESIGN.md
  - 2 values changed
  - 1 token added
  - 1 token added to match CSS

Last synced: 2026-05-16 00:45
```

## Integration

### After Visual Changes
```bash
# Made changes to globals.css
/design-sync

# Review the diff
git diff DESIGN.md
```

### Before PR
```bash
# Audit mode — just check, don't update
/design-sync --audit

# If drift detected, sync it
/design-sync
```

### With /ds-check
```bash
# Check design system compliance first
/ds-check clients

# If issues found, sync DESIGN.md
/design-sync
```

## Token Mapping

| CSS Variable | DESIGN.md Location |
|--------------|-------------------|
| `--background` | `colors.background` |
| `--foreground` | `colors.foreground` |
| `--primary` | `colors.primary` |
| `--font-sans` | `typography.sans.fontFamily` |
| `--radius-sm` | `rounded.sm` |
| `--spacing-4` | `spacing.4` |

## Troubleshooting

### "Token not in CSS"
The token exists in DESIGN.md but not in globals.css. Either:
- Add it to globals.css
- Remove it from DESIGN.md

### "Values don't match format"
DESIGN.md uses hex (`#FAFAFA`), but CSS might use other formats. The sync normalizes to hex.

### "Can't parse globals.css"
Check for syntax errors in the CSS file.

## See Also

- `/ds-check` — Check components against design system
- `/brand-check` — Verify brand consistency
- `DESIGN.md` — The design contract for AI agents
