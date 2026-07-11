# /playbook

Create, validate, or edit Salt playbooks.

## Usage

```
/playbook new <slug>       # Scaffold a new playbook
/playbook validate <slug>  # Validate an existing playbook
/playbook edit <slug>      # Open and edit an existing playbook
/playbook compile          # Run playbooks:compile (validates all + generates seed)
```

## Workflow

This command invokes the playbook-creator skill. See:
- `.claude/skills/playbook-creator/SKILL.md` (mirror)
- `.cursor/skills/playbook-creator/SKILL.md` (source of truth)

### Creating a new playbook

1. Run `/playbook new <slug>` to scaffold the directory structure
2. Edit `playbook.md` with the procedure and definition
3. For acting playbooks, create `evals.json` with test cases
4. Run `/playbook validate <slug>` to check before compiling
5. Run `/playbook compile` to generate the seed migration

### Playbook types

- **Acting playbooks:** Execute actions via the play DSL. Require definition JSON + evals.
- **Profile playbooks:** Fill record fields via rules. May have fill_rules JSON or be policy-only.
- **Keeper playbooks:** Profile-kind playbooks owned by the Keeper player. Seeded manually, not compiled.

### Memory-monopoly constraint

Only keeper playbooks may use memory-mutating action slugs:
- `memory_create_*`, `memory_update_*`, `memory_archive_*`
- `memory_link_*`, `memory_unlink_*`
- `memory_classify_person`
- `memory_create_note`, `memory_create_meeting`

Non-keeper playbooks that attempt to use these slugs will fail validation.

## Quick commands

```bash
# Validate a specific playbook
pnpm exec tsx .cursor/skills/playbook-creator/scripts/validate.ts <slug>

# Compile all playbooks (validates keepers + compiles acting)
pnpm playbooks:compile

# Run keeper validation only
pnpm exec tsx .scratch/validate-keeper-playbooks.ts
```
