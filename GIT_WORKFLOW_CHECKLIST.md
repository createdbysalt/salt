# Git Workflow Checklist

## 🎯 When to Stage + Commit

Commit when you hit any of these:
- [ ] ✅ Completed a Linear issue (SC-123)
- [ ] ✅ Reached a working checkpoint (feature works, tests pass)
- [ ] ✅ About to ask AI for help with something new
- [ ] ✅ End of work session

## 📝 How to Commit (in Cursor)

1. Open **Source Control** (left sidebar, git icon)
2. Review changed files
3. Click **+** to stage files (or stage all)
4. Write commit message:
   - `feat: add user login form`
   - `fix: resolve auth redirect bug`
   - `refactor: simplify dashboard layout`
5. Click **✓ Commit**

## 🚀 When to Push

Push when you hit any of these:
- [ ] After 1-3 commits (don't let them pile up)
- [ ] About to open a PR
- [ ] End of day (backup to GitHub)

## 📋 Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code cleanup
- `docs:` documentation
- `chore:` maintenance
- `test:` add/update tests

Example: `feat: add CodeQL security scanning workflow`

## ⚠️ Before Committing

Quick checks:
- [ ] No `.env.local` files staged (check Source Control)
- [ ] No actual secrets in code (API keys, passwords)
- [ ] Code builds without errors
- [ ] Linter passes (or document why not)

## 🔁 Daily Rhythm

**Morning:**
- Pull latest: `git pull`

**During work:**
- Commit every checkpoint

**End of day:**
- Commit + Push everything
- Check Source Control badge is clear (no number)

---

**💡 Tip**: If you see a number badge on the Source Control icon → you have uncommitted work!

