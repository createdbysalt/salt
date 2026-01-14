# CLI Commands Reference

**Context:** Common commands used during Salt Core development.

## Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm dev` | Start development server | Daily development |
| `pnpm build` | Build for production | Before deploying, testing |
| `pnpm start` | Start production server | Testing production build |
| `pnpm lint` | Run ESLint | Before commits |
| `pnpm lint --fix` | Auto-fix lint errors | Clean up code |
| `pnpm format` | Format with Prettier | Code cleanup |

## Database Commands

### Supabase CLI

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npx supabase start` | Start local Supabase | Local development |
| `npx supabase stop` | Stop local Supabase | Done developing |
| `npx supabase status` | Check local status | Debugging |
| `npx supabase db reset` | Reset local database | Fresh start |

### Migrations

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npx supabase migration new <name>` | Create new migration | Schema changes |
| `npx supabase db push` | Apply migrations to remote | Deploy changes |
| `npx supabase db pull` | Pull remote schema | Sync with production |
| `npx supabase db diff` | Show schema differences | Before migrations |

### Type Generation

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npx supabase gen types typescript` | Generate TypeScript types | After schema changes |
| `pnpm gen:types` | Alias for type generation | Preferred method |

## Stripe Commands

### Stripe CLI

| Command | Description | When to Use |
|---------|-------------|-------------|
| `stripe login` | Authenticate Stripe CLI | First time setup |
| `stripe listen --forward-to localhost:3000/api/webhook/stripe` | Forward webhooks | Local development |
| `pnpm stripe:webhooks` | Start webhook forwarding | Testing payments |

### Testing Webhooks

| Command | Description | When to Use |
|---------|-------------|-------------|
| `stripe trigger checkout.session.completed` | Test successful payment | Testing subscription flow |
| `stripe trigger customer.subscription.updated` | Test subscription update | Testing plan changes |
| `stripe trigger customer.subscription.deleted` | Test cancellation | Testing churn flow |

## Testing Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm test` | Run all tests | Before merging |
| `pnpm test:watch` | Run tests in watch mode | During development |
| `pnpm test:e2e` | Run Playwright tests | Full integration testing |
| `npx playwright test --ui` | Open Playwright UI | Debug E2E tests |

## Build Analysis

| Command | Description | When to Use |
|---------|-------------|-------------|
| `ANALYZE=true pnpm build` | Analyze bundle size | Performance optimization |
| `pnpm check:types` | TypeScript type check | Verify types compile |
| `pnpm check:no-daisyui` | Ensure no legacy UI classes | Code quality check |

## Git Commands

### Branch Management

| Command | Description |
|---------|-------------|
| `git checkout -b feature/SC-123-description` | Create feature branch |
| `git checkout main && git pull` | Update main branch |
| `git rebase main` | Rebase on latest main |

### Committing

| Command | Description |
|---------|-------------|
| `git add -A` | Stage all changes |
| `git commit -m "feat: add user authentication"` | Conventional commit |
| `git push -u origin feature/branch-name` | Push new branch |

### Common Workflows

```bash
# Start new feature
git checkout main
git pull
git checkout -b feature/SC-123-add-billing

# Commit changes
git add -A
git commit -m "feat: add Stripe billing integration"

# Update with main
git checkout main
git pull
git checkout feature/SC-123-add-billing
git rebase main

# Push changes
git push -u origin feature/SC-123-add-billing
```

## Deployment Commands

### Vercel

| Command | Description | When to Use |
|---------|-------------|-------------|
| `vercel` | Deploy preview | Test deployment |
| `vercel --prod` | Deploy to production | Release to production |
| `vercel env pull` | Pull env variables | Sync with Vercel |
| `vercel logs` | View function logs | Debug production |

### Database Deployment

```bash
# Deploy to production
npx supabase link --project-ref <project-id>
npx supabase db push

# Create production migration
npx supabase db diff --use-migra -f <migration-name>
```

## Utility Commands

### Cleaning

| Command | Description | When to Use |
|---------|-------------|-------------|
| `rm -rf node_modules package-lock.json` | Clean dependencies | Dependency issues |
| `rm -rf .next` | Clean build cache | Build issues |
| `pnpm store prune` | Clean pnpm store | Package issues |

### Debugging

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm list <package>` | Check package versions | Version conflicts |
| `pnpm outdated` | Check for updates | Maintenance |
| `pnpm update --interactive` | Interactive updates | Upgrade dependencies |

## Script Shortcuts

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > types/supabase.ts",
    "stripe:listen": "stripe listen --forward-to localhost:3000/api/webhook/stripe",
    "clean": "rm -rf .next node_modules",
    "fresh": "pnpm clean && pnpm install && pnpm dev"
  }
}
```

## Environment-Specific Commands

### Development Only

```bash
# Seed test data
pnpm seed:test-users

# Generate mock data
pnpm generate:mock-data

# Reset to clean state
pnpm reset:all
```

### Production Only

```bash
# Run production checks
pnpm check:prod

# Validate environment
pnpm validate:env

# Database backup
pnpm backup:db
```

## Troubleshooting Commands

### Port Issues

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Permission Issues

```bash
# Fix node_modules permissions
sudo chown -R $(whoami) node_modules

# Fix global pnpm permissions
sudo chown -R $(whoami) ~/.local/share/pnpm
```

### Cache Issues

```bash
# Clear all caches
pnpm store prune
rm -rf .next
rm -rf node_modules/.cache
```