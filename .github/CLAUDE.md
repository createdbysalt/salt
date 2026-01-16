# ⚙️ GitHub Automation & Claude-Assisted Workflows

**Context:** You are automating development workflows for Salt Core's high-velocity SaaS development.
**Goal:** Streamline PR reviews, security checks, and deployment processes using Claude AI.

---

## 1. 🤖 Automated Code Review Patterns

### Claude Code Review Integration
**File:** `.github/workflows/claude-code-review.yml`

The automated review system analyzes:
- **Security**: RLS policy compliance, authentication patterns
- **Architecture**: Multi-tenant data isolation, proper component placement
- **Performance**: Database query optimization, rendering strategies
- **Code Quality**: TypeScript usage, Next.js 15 patterns

### Review Trigger Conditions
```yaml
# Triggers for automatic Claude review
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - 'app/**'           # Application code
      - 'supabase/**'      # Database changes
      - 'packages/**'      # Shared packages
      - '**.ts'            # TypeScript files
      - '**.tsx'           # React components
```

### Security-Critical File Patterns
```markdown
# Automatic security review for these patterns:
- `supabase/migrations/*.sql`     # Database schema changes
- `app/_lib/permissions/**`       # Permission logic
- `app/_lib/supabase/**`          # Database access layer
- `middleware.ts`                 # Auth middleware
- `app/api/**`                    # API routes
- `**/auth/**`                    # Authentication flows
```

---

## 2. 📋 Pull Request Quality Gates

### Required PR Template Sections
All PRs must complete these sections:

#### Security Checklist (Non-Negotiable)
```markdown
- [ ] No service role keys exposed on client
- [ ] RLS policies reviewed (if touching database)
- [ ] Auth/permissions checks in place
- [ ] No hardcoded secrets or API keys
```

#### Code Quality Standards
```markdown
- [ ] TypeScript types are correct (no `any` unless absolutely necessary)
- [ ] Code follows Next.js 15 patterns (async headers/cookies/params)
- [ ] Server components used where possible
- [ ] Lint and typecheck pass
```

#### Testing Requirements
```markdown
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All existing tests pass
```

### Claude Review Criteria
```markdown
The automated Claude review checks:

**SECURITY (Block if failed):**
- RLS policies properly scope multi-tenant data
- No auth bypasses or permission escalation
- Sensitive data not logged or exposed

**ARCHITECTURE (Block if failed):**
- Components placed in correct directories
- Proper separation of concerns
- Multi-tenant patterns followed

**PERFORMANCE (Warn if issues):**
- Database queries are optimized
- Large components are lazy-loaded
- Proper caching strategies used

**CODE QUALITY (Warn if issues):**
- TypeScript types are specific
- Error handling is comprehensive
- Tests cover critical paths
```

---

## 3. 🚨 Security Review Automation

### Automated Security Scanning
**File:** `.github/workflows/claude-code-security-review.yml`

Triggers on:
- Database schema changes (`supabase/migrations/*.sql`)
- Permission system modifications (`app/_lib/permissions/**`)
- API route changes (`app/api/**`)
- Authentication flow updates (`**/auth/**`)

### Security Review Checklist
```markdown
For database changes:
- [ ] New tables have RLS enabled
- [ ] Foreign keys specify cascade behavior
- [ ] Policies follow studio_id scoping pattern
- [ ] No data leakage between tenants possible

For API routes:
- [ ] Authentication required for protected endpoints
- [ ] Input validation and sanitization
- [ ] Rate limiting applied where appropriate
- [ ] Error messages don't leak sensitive data

For permission changes:
- [ ] Role hierarchies are preserved
- [ ] Permission escalation is prevented
- [ ] Audit logging is maintained
```

### Emergency Stop Conditions
```yaml
# Auto-block PR if these conditions are detected:
CRITICAL_SECURITY_ISSUES:
  - "DISABLE ROW LEVEL SECURITY"
  - "auth.uid() IS NULL"
  - "createAdminClient()" in user-facing code
  - Hardcoded secrets in non-test files
  - Direct user input in SQL queries
```

---

## 4. 🔄 Deployment Automation Patterns

### Deployment Readiness Checks
```markdown
Before any deployment to production:

**Database Safety:**
- [ ] Migration files tested on staging
- [ ] Rollback SQL prepared and tested
- [ ] No breaking schema changes without feature flags

**Application Safety:**
- [ ] Feature flags configured for new features
- [ ] Error tracking and monitoring in place
- [ ] Performance monitoring configured

**Security Verification:**
- [ ] Security review completed
- [ ] No new high-severity vulnerabilities
- [ ] Auth flows tested in staging environment
```

### Automated Rollback Triggers
```yaml
# Conditions that trigger automatic rollback
ROLLBACK_CONDITIONS:
  - Error rate > 1% for 5 minutes
  - Database connection failures > 10%
  - Authentication failures > 5%
  - Core Web Vitals degradation > 20%
```

---

## 5. 📊 Issue Triage Automation

### Automatic Issue Labeling
```yaml
# Auto-label issues based on content
SECURITY_KEYWORDS:
  - "security", "vulnerability", "auth", "permission"
  → Label: "security-review-required"

BUG_KEYWORDS:
  - "error", "crash", "broken", "not working"
  → Label: "bug"

FEATURE_KEYWORDS:
  - "feature request", "enhancement", "new"
  → Label: "enhancement"

DATABASE_KEYWORDS:
  - "database", "migration", "RLS", "supabase"
  → Label: "database-change"
```

### Priority Assignment Rules
```markdown
**P0 (Critical) - Auto-assign:**
- Security vulnerabilities
- Database corruption issues
- Authentication system failures
- Payment processing errors

**P1 (High) - Auto-assign:**
- Multi-tenant data leakage
- Performance degradation > 50%
- Core feature failures

**P2 (Medium) - Default:**
- UI/UX improvements
- Feature requests
- Non-critical bugs
```

---

## 6. 🔗 Linear Integration Patterns

### GitHub ↔ Linear Sync
**File:** `.github/LINEAR_GITHUB_WORKFLOW.md`

Automatic synchronization:
- GitHub issues → Linear tickets
- PR status updates → Linear ticket status
- Deployment success → Linear ticket completion

### Commit Message Integration
```markdown
# Commit message format for Linear integration:
git commit -m "feat: add client portal dashboard

Implements user story SALT-123 with responsive design
and real-time updates.

Resolves SALT-123"

# Auto-updates Linear ticket status based on keywords:
- "Implements" → In Progress
- "Resolves" → Ready for Review
- "Fixes" → Bug Fixed
```

---

## 7. 📈 Performance Monitoring Integration

### Automated Performance Checks
```yaml
# Performance regression detection
on:
  pull_request:
    paths:
      - 'app/**'
      - 'packages/**'

PERFORMANCE_THRESHOLDS:
  lighthouse_performance: 90
  lighthouse_accessibility: 95
  lighthouse_seo: 95
  bundle_size_increase: 5%  # Max increase allowed
```

### Core Web Vitals Monitoring
```markdown
Performance gates for production deployment:

**Core Web Vitals:**
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] FID < 100ms (First Input Delay)
- [ ] CLS < 0.1 (Cumulative Layout Shift)

**Bundle Analysis:**
- [ ] No unexpected large dependencies added
- [ ] Tree shaking working correctly
- [ ] Dynamic imports used for heavy components
```

---

## 8. 🧪 Testing Automation Patterns

### Test Coverage Requirements
```yaml
# Minimum coverage requirements by file type
COVERAGE_REQUIREMENTS:
  api_routes: 90%        # Critical business logic
  permissions: 95%       # Security-critical
  billing: 90%          # Payment processing
  auth_flows: 85%        # Authentication
  ui_components: 70%     # User interface
```

### Automated Test Categories
```markdown
**Unit Tests (Required):**
- All new functions and components
- Permission checking logic
- Data transformation utilities
- Business logic calculations

**Integration Tests (Required for):**
- API endpoints with database changes
- Authentication flows
- Payment processing workflows
- Multi-tenant data access

**E2E Tests (Required for):**
- User registration and onboarding
- Client portal access flows
- Billing and subscription changes
- Core feature workflows
```

---

## 9. 🚀 Release Automation

### Release Branch Strategy
```markdown
**Main Branch Protection:**
- All commits must come via PR
- Required status checks: tests, security scan, Claude review
- Require review from code owner
- Dismiss stale reviews when new commits pushed

**Release Process:**
1. Create release branch: `release/v1.2.3`
2. Run full test suite + security audit
3. Generate release notes automatically
4. Deploy to staging for final validation
5. Merge to main with release tag
6. Auto-deploy to production with monitoring
```

### Hotfix Process
```yaml
# Emergency hotfix workflow
HOTFIX_CONDITIONS:
  - Security vulnerability discovered
  - Critical production bug
  - Data integrity issue

HOTFIX_PROCESS:
  1. Create hotfix branch from main
  2. Apply minimal necessary changes
  3. Skip non-critical CI checks (with approval)
  4. Deploy with enhanced monitoring
  5. Follow up with full review cycle
```

---

## 10. 📚 Documentation Automation

### Auto-Generated Documentation
```yaml
# Automatic documentation updates
on:
  push:
    paths:
      - 'app/_lib/**'          # API documentation
      - 'supabase/migrations/**'  # Schema documentation
      - 'packages/**'             # Package documentation

DOCUMENTATION_TARGETS:
  - API endpoint documentation
  - Database schema diagrams
  - Component usage examples
  - Architecture decision records
```

### CLAUDE.md File Validation
```markdown
**Automated checks for CLAUDE.md files:**
- [ ] All file paths are valid
- [ ] No broken internal links
- [ ] Code examples compile
- [ ] Documentation is up-to-date with code changes

**When CLAUDE.md files change:**
- Validate all referenced files exist
- Check code examples for syntax errors
- Verify architectural patterns are current
- Update cross-references automatically
```

---

## 11. 🔧 Workflow Optimization Tips

### Claude Prompt Optimization
```markdown
For best Claude review results:

**PR Description Quality:**
- Include clear problem statement
- Explain architectural decisions made
- Note any security considerations
- Highlight performance implications

**Code Comments:**
- Document non-obvious business logic
- Explain security-related decisions
- Note performance optimizations
- Include references to related issues
```

### Review Efficiency Patterns
```markdown
**Auto-approve conditions:**
- Documentation-only changes
- Test file additions (no logic changes)
- Dependency updates with passing tests
- CLAUDE.md file improvements

**Require human review:**
- Database schema changes
- Authentication system modifications
- Payment processing logic
- Multi-tenant isolation boundaries
```

---

## 12. 🚨 Emergency Response Automation

### Incident Detection
```yaml
# Auto-create incident issues for:
CRITICAL_CONDITIONS:
  - Production error rate > 5%
  - Database connection failures
  - Authentication system downtime
  - Payment processing failures
  - Security vulnerability reports

# Auto-notify channels:
  - #incidents (Slack)
  - On-call engineer (PagerDuty)
  - Engineering team (email)
```

### Recovery Automation
```markdown
**Automated recovery procedures:**
- Rollback to last known good deployment
- Scale up infrastructure if performance issues
- Enable maintenance mode if critical failures
- Generate incident report template
- Notify stakeholders with status updates

**Manual intervention triggers:**
- Database corruption detected
- Security breach suspected
- Payment system compromise
- Multi-tenant data leakage
```

---

## 🛠️ Troubleshooting Guide

### Claude Code Action Exit Code 1 Bug

**Issue:** Claude Code Action consistently fails with exit code 1, fast failure (~120ms), and $0 API cost.

**Root Cause:** This is a known bug in the Claude Code Action (GitHub issue #804) where the action exits before making API calls.

**Symptoms:**
```yaml
{
  "type": "result",
  "subtype": "success",
  "is_error": true,
  "duration_ms": 120,
  "total_cost_usd": 0
}
```

**Workaround Applied:**
```yaml
- name: Run Claude Code Review
  continue-on-error: true  # Don't fail the workflow
  uses: anthropics/claude-code-action@main
  with:
    show_full_output: true  # Enable debugging
    # ... other configuration

- name: Check Claude Review Status
  if: always()
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    echo "Note: Claude Code Action has known bug #804"
    echo "Check PR comments manually to verify if review posted"
```

**Status:** Monitoring upstream issue for permanent fix.

---

## Why This Automation Maximizes Velocity

1. **Reduces Review Time**: Claude handles routine checks, humans focus on high-level architecture
2. **Prevents Security Issues**: Automated scanning catches common vulnerabilities early
3. **Maintains Quality**: Consistent enforcement of coding standards and patterns
4. **Enables Rapid Deployment**: Automated testing and deployment with safety nets
5. **Scales Team Productivity**: Junior developers get guidance, senior developers focus on complex problems

**Remember**: Automation should enhance human judgment, not replace it. Always design escape hatches for emergency situations.