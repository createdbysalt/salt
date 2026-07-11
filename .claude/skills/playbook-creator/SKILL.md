# Playbook Creator Skill (Claude Code Mirror)

This is a thin mirror of the Cursor playbook-creator skill. The source of truth lives in `.cursor/skills/playbook-creator/`.

**Do not duplicate content here.** Read the Cursor skill files directly:

- **Instructions:** `.cursor/skills/playbook-creator/SKILL.md`
- **References:** `.cursor/skills/playbook-creator/references/`
- **Scripts:** `.cursor/skills/playbook-creator/scripts/`
- **Dogfood examples:** `.cursor/skills/playbook-creator/dogfood/`

## Quick Reference

### Creating a new playbook

1. Read `.cursor/skills/playbook-creator/SKILL.md` for the full workflow
2. Create a directory under `app/_features/plays/playbooks/<slug>/`
3. Write `playbook.md` with frontmatter + procedure + JSON block
4. For acting playbooks: create `evals.json` with test cases
5. Run `pnpm playbooks:compile` to validate and generate seed migration

### Validating a playbook

```bash
pnpm exec tsx .cursor/skills/playbook-creator/scripts/validate.ts <slug>
```

### Key constraints

- **Memory-monopoly:** Only keeper playbooks may use memory-mutating action slugs
- **Keeper playbooks:** Excluded from compiler (seeded manually), validated during compile
- **Acting playbooks:** Require definition JSON + evals, compiled into seed migration
- **Profile playbooks:** fill_rules JSON optional (policy-only keepers have none)

### Domain knowledge split

| Location | Scope |
|----------|-------|
| **Player context** (DB) | Shared across all playbooks for that player |
| **Playbook `references/`** | Specific to one playbook |

Rule of three: If knowledge would appear in 3+ playbooks for the same player, move it to player context (edited in Plays → Players).

### Trigger signals

Trigger signals must exist in the signal registry (`signal-registry.ts`). Invalid signals fail at compile time.

See `docs/architecture/playbook-formula.md` for the full playbook contract.
