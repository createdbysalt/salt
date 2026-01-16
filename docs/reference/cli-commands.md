# CLI Commands Reference

**Context:** Complete list of commands available during Salt Core development.

## Development Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm dev` | Start development server on port 3000 | Daily development |
| `pnpm build` | Build for production | Before deploying, testing |
| `pnpm postbuild` | Generate sitemap after build | Automatic after build |
| `pnpm start` | Start production server | Testing production build |
| `pnpm lint` | Run ESLint | Before commits |
| `pnpm typecheck` | TypeScript type checking | Verify types |
| `pnpm format` | Format code with Prettier | Code cleanup |
| `pnpm format:check` | Check code formatting | CI/validation |

---

## Testing Commands

### Unit Testing (Vitest)
| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm test` | Run all unit tests | Before commits |
| `pnpm test:watch` | Run tests in watch mode | During development |
| `pnpm test:coverage` | Run tests with coverage | Checking test coverage |

### E2E Testing (Playwright)
| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm test:e2e` | Run E2E tests | Before major releases |
| `pnpm test:e2e:ui` | Run E2E with interactive UI | Debugging test failures |
| `pnpm test:e2e:debug` | Debug E2E tests | Investigating failures |
| `pnpm test:e2e:legacy` | Run legacy E2E tests | Legacy test suite |
| `pnpm test:e2e:legacy:ui` | Legacy E2E with UI | Debugging legacy tests |
| `pnpm test:e2e:legacy:debug` | Debug legacy E2E tests | Legacy debugging |

### Combined Testing
| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm test:all` | Run unit + E2E tests | Full test validation |

---

## Database Commands

### Supabase CLI
| Command | Description | When to Use |
|---------|-------------|-------------|
| `supabase start` | Start local Supabase | Local development |
| `supabase stop` | Stop local Supabase | Done developing |
| `supabase status` | Check local status | Debugging |
| `supabase db reset` | Reset local database | Fresh start |
| `supabase db push` | Push migrations to remote | Deploy schema changes |
| `supabase gen types typescript` | Generate TypeScript types | After schema changes |

### Database Management
| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm dlx supabase db push` | Push migrations via pnpm | Deploy schema changes |

---

## Stripe Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm stripe:setup-products` | Setup Stripe products | Initial Stripe configuration |
| `pnpm stripe:webhooks` | Setup Stripe webhooks | Webhook configuration |

---

## Seeding & Setup Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm seed:test-users` | Seed test users | Local development setup |

---

## Quality Assurance Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm check:no-daisyui` | Check for DaisyUI usage | Code quality validation |

---

## Utility Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm clean` | Clean build artifacts | Fresh start, troubleshooting |

---

## Package Management

### Adding Dependencies
| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm add [package]` | Add production dependency | New runtime dependency |
| `pnpm add -D [package]` | Add dev dependency | Development tools |
| `pnpm install` | Install all dependencies | Initial setup, after git pull |

### Package-Specific Commands
```bash
# Run commands in specific packages
cd packages/ui && pnpm test
cd packages/logger && pnpm build

# Install dependencies for specific packages
cd packages/security && pnpm add zod
```

---

## Git Workflow Commands

### Pre-Commit Workflow
```bash
# Recommended workflow before committing
pnpm typecheck           # Check TypeScript
pnpm lint               # Check linting
pnpm test              # Run unit tests
pnpm format            # Format code

# Or combined check
pnpm typecheck && pnpm lint && pnpm test
```

### Pre-Release Workflow
```bash
# Full validation before release
pnpm clean             # Clean artifacts
pnpm install           # Fresh dependencies
pnpm typecheck         # Type checking
pnpm lint              # Linting
pnpm test              # Unit tests
pnpm build             # Production build
pnpm test:e2e          # E2E tests
```

---

## Environment-Specific Commands

### Development
```bash
pnpm dev               # Start dev server
pnpm test:watch        # Watch tests
```

### Testing/Staging
```bash
pnpm build             # Build for testing
pnpm start             # Test production build
pnpm test:all          # Run all tests
```

### Production Deployment
```bash
pnpm install --frozen-lockfile  # Exact dependency versions
pnpm build                       # Production build
pnpm start                       # Start production server
```

---

## Debugging Commands

### Development Issues
```bash
# TypeScript issues
pnpm typecheck

# Dependency issues
pnpm clean && pnpm install

# Build issues
pnpm clean && pnpm build

# Test failures
pnpm test:watch
pnpm test:e2e:ui
```

### Performance Analysis
```bash
# Build analysis
pnpm build              # Check build output
```

---

## Port Requirements

⚠️ **CRITICAL:** The application MUST run on port 3000 for testing and development.

```bash
# If port 3000 is in use, kill the process:
lsof -ti:3000 | xargs kill -9
pnpm dev
```

**Why port 3000 is required:**
- E2E tests expect `localhost:3000`
- Database configurations hardcoded to this port
- Authentication flows configured for this port

---

## Command Aliases & Shortcuts

### Common Workflows
```bash
# Quick development start
alias dev="pnpm dev"

# Quick test cycle
alias qtest="pnpm typecheck && pnpm lint && pnpm test"

# Clean restart
alias restart="pnpm clean && pnpm install && pnpm dev"

# Full validation
alias validate="pnpm typecheck && pnpm lint && pnpm test && pnpm build"
```

---

## Monorepo Commands

### Package Workspace Commands
```bash
# List all packages
ls packages/

# Run command in all packages
pnpm -r test            # Run test in all packages

# Run command in specific package
cd packages/ui && pnpm test
```

### Dependency Management
```bash
# Add dependency to specific package
cd packages/ui && pnpm add react

# Update dependencies
pnpm update             # Update root dependencies
pnpm -r update          # Update all package dependencies
```

---

## CI/CD Commands

### GitHub Actions
```bash
# Commands typically run in CI
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

### Local CI Simulation
```bash
# Simulate CI locally
pnpm clean
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

## Troubleshooting Guide

### Common Issues

**TypeScript Errors:**
```bash
pnpm typecheck
# Fix reported issues
```

**Lint Errors:**
```bash
pnpm lint --fix
# Manually fix remaining issues
```

**Test Failures:**
```bash
pnpm test:watch
# Run specific failing test
pnpm test -- failing-test.spec.ts
```

**Build Failures:**
```bash
pnpm clean
pnpm install
pnpm build
```

**E2E Test Failures:**
```bash
# Ensure dev server is running on port 3000
pnpm dev

# In another terminal
pnpm test:e2e:ui
```

**Port Issues:**
```bash
# Check what's using port 3000
lsof -i:3000

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Start dev server
pnpm dev
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| **Start development** | `pnpm dev` |
| **Run tests** | `pnpm test` |
| **Check types** | `pnpm typecheck` |
| **Fix linting** | `pnpm lint --fix` |
| **Build production** | `pnpm build` |
| **Run E2E tests** | `pnpm test:e2e` |
| **Clean restart** | `pnpm clean && pnpm install` |
| **Full validation** | `pnpm test:all` |