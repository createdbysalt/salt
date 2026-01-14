# Development Workflow

**Context:** Standard development practices and workflows for Salt Core.

## Branch Strategy

### Branch Types

| Type | Format | Purpose | Example |
|------|--------|---------|---------|
| Main | `main` | Production-ready code | `main` |
| Feature | `feature/SC-{issue}-{description}` | New features | `feature/SC-123-add-billing` |
| Fix | `fix/SC-{issue}-{description}` | Bug fixes | `fix/SC-456-auth-error` |
| Refactor | `refactor/{description}` | Code improvements | `refactor/clean-up-api-routes` |
| Docs | `docs/{description}` | Documentation only | `docs/update-readme` |

### Branch Rules

1. **Always branch from main** - Keep branches up to date
2. **Small, focused branches** - One feature/fix per branch
3. **Frequent commits** - Commit logical chunks of work
4. **Rebase before merging** - Keep history clean

## Starting New Work

### 1. Update Local Main

```bash
git checkout main
git pull origin main
```

### 2. Create Feature Branch

```bash
# For Linear/Jira tickets
git checkout -b feature/SC-123-add-user-profiles

# For general work
git checkout -b refactor/improve-error-handling
```

### 3. Set Up Environment

```bash
# Install any new dependencies
pnpm install

# Run migrations if database changed
npx supabase db reset

# Start dev server
pnpm dev
```

## During Development

### Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add user profile page"
git commit -m "feat(auth): implement magic link login"

# Fixes
git commit -m "fix: resolve infinite loop in dashboard"
git commit -m "fix(stripe): handle webhook timeout"

# Other types
git commit -m "docs: update API documentation"
git commit -m "style: format code with prettier"
git commit -m "refactor: extract billing logic to separate module"
git commit -m "test: add unit tests for auth service"
git commit -m "chore: update dependencies"
git commit -m "perf: optimize image loading"
```

### Commit Best Practices

```bash
# Stage specific files
git add src/components/UserProfile.tsx
git add src/hooks/useUser.ts

# Review changes
git diff --staged

# Commit with descriptive message
git commit -m "feat: add user avatar upload to profile

- Add avatar upload component
- Store images in Supabase storage
- Update user table with avatar_url
- Add loading and error states"
```

### Work in Progress

```bash
# Save work without committing
git stash

# Continue later
git stash pop

# Or commit with WIP
git commit -m "WIP: implementing search feature"
# Then amend when done
git commit --amend -m "feat: add global search functionality"
```

## Code Quality Checks

### Before Committing

```bash
# Run TypeScript compiler
pnpm build

# Run linter
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Run tests
pnpm test
```

### Pre-Push Checklist

- [ ] Code builds without errors
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Tests pass (if applicable)
- [ ] No hardcoded values
- [ ] No exposed secrets
- [ ] Database migrations included (if schema changed)

## Submitting Pull Requests

### 1. Push Branch

```bash
# First push
git push -u origin feature/SC-123-add-user-profiles

# Subsequent pushes
git push
```

### 2. Create PR

Use GitHub PR template or include:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added tests (if applicable)
- [ ] All tests pass

## Checklist
- [ ] My code follows the project style
- [ ] I've performed self-review
- [ ] I've commented complex code
- [ ] I've updated documentation
- [ ] No new warnings
- [ ] Changes are backwards compatible

## Screenshots (if UI changes)
[Add screenshots here]

## Related Issues
Fixes #123
```

### 3. PR Best Practices

- **Keep PRs small** - Easier to review
- **One concern per PR** - Don't mix features and fixes
- **Update often** - Rebase on main regularly
- **Respond to feedback** - Address all comments
- **Clean history** - Squash commits if needed

## Code Review Process

### For Reviewers

1. **Check functionality** - Does it work as expected?
2. **Review code quality** - Follows conventions?
3. **Security review** - No vulnerabilities?
4. **Performance impact** - No regressions?
5. **Test coverage** - Adequate tests?

### For Authors

1. **Self-review first** - Check your own PR
2. **Provide context** - Explain complex changes
3. **Be responsive** - Address feedback promptly
4. **Update PR description** - Keep it current
5. **Test after changes** - Ensure fixes work

## Handling Conflicts

### Rebase Strategy

```bash
# Update main
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/SC-123-add-user-profiles
git rebase main

# Resolve conflicts
# Edit conflicted files
git add .
git rebase --continue

# Force push (only for feature branches!)
git push --force-with-lease
```

### Merge Conflicts

```bash
# If conflicts during merge
git status  # See conflicted files

# Edit files to resolve
# Look for <<<<<<< ======= >>>>>>>

# After resolving
git add resolved-file.ts
git commit
```

## Deployment Process

### Development Deploy

```bash
# Automatic on push to main
# Preview deploys for PRs
```

### Production Deploy

```bash
# 1. Ensure all tests pass
pnpm test

# 2. Build locally
pnpm build

# 3. Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# 4. Deploy happens automatically
```

## Database Migrations

### Creating Migrations

```bash
# Create new migration
npx supabase migration new add_user_preferences

# Edit the migration file
# supabase/migrations/[timestamp]_add_user_preferences.sql
```

### Migration Best Practices

```sql
-- Always include IF NOT EXISTS
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always add RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Include rollback comments
-- DROP TABLE IF EXISTS user_preferences;
```

### Applying Migrations

```bash
# Local development
npx supabase db reset

# Production
npx supabase db push
```

## Debugging Workflow

### 1. Identify Issue

```bash
# Check logs
pnpm dev
# Look for error messages

# Check browser console
# Open DevTools → Console

# Check network tab
# Open DevTools → Network
```

### 2. Reproduce Locally

```bash
# Get latest code
git pull origin main

# Reset environment
npx supabase db reset
pnpm install

# Reproduce issue
# Follow steps from bug report
```

### 3. Fix and Verify

```bash
# Create fix branch
git checkout -b fix/SC-789-auth-error

# Make changes
# Test thoroughly

# Verify fix
pnpm build
pnpm test
```

## Environment Management

### Local Development

```bash
# Copy example env
cp .env.example .env.local

# Update with your values
# Never commit .env.local!
```

### Environment Sync

```bash
# Pull from Vercel (if using)
vercel env pull

# Compare environments
diff .env.example .env.local
```

## Troubleshooting Common Issues

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
pnpm build

# Type errors
pnpm check:types
```

### Dependency Issues

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check for conflicts
pnpm list
```

### Database Issues

```bash
# Reset local database
npx supabase db reset

# Check migration status
npx supabase db status

# Pull from remote
npx supabase db pull
```

## Team Communication

### During Development

- Update ticket status in Linear/Jira
- Comment on blockers or questions
- Share progress in team chat
- Request review when ready

### PR Comments

- Use GitHub suggestions for small changes
- Explain complex logic with comments
- Link to relevant documentation
- Be constructive and specific

## Release Process

### Version Naming

- **Major** (1.0.0) - Breaking changes
- **Minor** (1.1.0) - New features
- **Patch** (1.1.1) - Bug fixes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration guide (if breaking)
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Tag created
- [ ] Release notes written