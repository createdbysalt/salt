# Migration Lessons Learned

## Session: Jan 15, 2025

### Issue 1: Stale .next Cache After Import Changes

**Symptom**: After migrating imports to `@repo/shared-types`, the dev server threw:
```
Error: Cannot find module './7890.js'
```

**Root Cause**: Next.js webpack caches module references in `.next/`. When import paths change significantly (especially to workspace packages), the cache becomes stale and references non-existent chunk files.

**Solution**:
```bash
rm -rf .next && pnpm dev
```

**Prevention**: Add cache clearing to validation workflow after any import path changes.

---

### Issue 2: Port 3000 Conflicts

**Symptom**: Dev server started on port 3001 instead of 3000.

**Root Cause**: Previous dev server process still running on port 3000.

**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
```

**Prevention**: Always check/kill port 3000 before starting dev server. E2E tests require port 3000.

---

### Issue 3: grep vs ripgrep Performance

**Symptom**: `grep -r` commands hung when searching codebase.

**Root Cause**: grep was scanning `node_modules/` and `node_modules_backup/` directories.

**Solution**: Use the Grep tool (ripgrep) instead of bash grep - it respects .gitignore automatically.

**Prevention**: Always use Grep tool for code search, never bash grep.

---

## Validation Workflow (Updated)

After each migration phase:

1. **Gate 1**: `pnpm tsc --noEmit` (type check)
2. **Gate 2**: `pnpm test` (unit tests in affected package)
3. **Gate 3**: `pnpm build` (full build)
4. **Gate 4**: Playwright smoke test
   - Navigate to localhost:3000
   - Click through to sign-in page
   - Verify UI components render

**If any gate fails after import changes**:
```bash
rm -rf .next && pnpm dev
```

---

## Package Migration Checklist

For each utility being migrated:

- [ ] Copy source to `packages/[pkg]/src/`
- [ ] Update barrel export in `index.ts`
- [ ] Write unit tests
- [ ] Run Gate 1 (types)
- [ ] Run Gate 2 (tests)
- [ ] Update all imports in app (use sed for bulk updates)
- [ ] Update original file to re-export from package (backward compat)
- [ ] Clear .next cache
- [ ] Run Gate 3 (build)
- [ ] Run Gate 4 (Playwright)
- [ ] Commit with descriptive message

---

## Useful Commands

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
rm -rf .next

# Bulk update imports (sed on macOS)
sed -i '' 's|from "@/lib/utils"|from "@repo/utils"|g' file.tsx

# Find files with specific import
grep -r 'from "@/lib/utils"' --include="*.ts" --include="*.tsx" app/ components/
```

---

## Notes for Future Sessions

- Always validate with Playwright between migration phases
- The `node_modules_backup/` directory should be excluded from searches
- Pre-existing Jest test files have errors - not related to migration
- Build succeeds even with those pre-existing type errors (they're in test files)
