# Terminology Update — Route Groups

## Changes Made

Updated all route group names throughout the codebase to use the new terminology:

### Old → New Terminology

| Old Name | New Name |
|----------|----------|
| `(marketing)` | `(core_marketing_site)` |
| `(studio)` | `(user_dashboard)` |
| `(bridge)` | `(client_bridge)` |

### Phase Names

| Old Name | New Name |
|----------|----------|
| Phase 1: Marketing Site | Phase 1: Core Marketing Site |
| Phase 2: Studio Admin MVP | Phase 2: User Dashboard MVP |
| Phase 3: Bridge MVP | Phase 3: Client Bridge MVP |

---

## Files Updated

### Directory Structure
- ✅ `app/(marketing)/` → `app/(core_marketing_site)/`
- ✅ `app/(studio)/` → `app/(user_dashboard)/`
- ✅ `app/(bridge)/` → `app/(client_bridge)/`

### Documentation Files
- ✅ `README.md` - Architecture overview + roadmap
- ✅ `PHASE_0_COMPLETE.md` - Technical details + phase descriptions
- ✅ `PHASE_0_SUMMARY.md` - Summary + next steps
- ✅ `PREFLIGHT_CHECKLIST.md` - Pre-flight verification
- ✅ `.github/LINEAR_GITHUB_WORKFLOW.md` - Workflow guide + labels

### Code Files
- ✅ `libs/tenancy/context.ts` - Route detection comments

### Issue Templates
- ✅ `.github/ISSUE_TEMPLATE/bug_report.md` - Area labels
- ✅ `.github/ISSUE_TEMPLATE/improvement.md` - Area checklist

---

## New Label System

### GitHub/Linear Area Labels

**Old:**
- `area:marketing`
- `area:studio`
- `area:bridge`

**New:**
- `area:core-marketing`
- `area:user-dashboard`
- `area:client-bridge`

---

## Route Patterns (Reference)

### User Dashboard (Studio Members)
- **Host**: `app.saltcore.dev`
- **Paths**: `/dashboard/**`
- **Actor Type**: `studioMember`

### Client Bridge (Client Users)
- **Host**: `bridge.saltcore.dev` or custom domains
- **Paths**: `/bridge/**`
- **Actor Type**: `clientUser`

### Core Marketing Site (Public)
- **Host**: `saltcore.dev` (root)
- **Paths**: `/`, `/pricing`, `/blog`, etc.
- **Actor Type**: `anonymous`

---

## Verification

✅ **TypeScript builds successfully** (`npm run build`)  
✅ **All route groups renamed**  
✅ **All documentation updated**  
✅ **All issue templates updated**  
✅ **Tenant resolution logic updated**

---

## Next Steps

When starting development:
1. Use new terminology in Linear projects/issues
2. Use new area labels: `area:core-marketing`, `area:user-dashboard`, `area:client-bridge`
3. Reference route groups with new names in code comments

---

**Updated:** December 28, 2025  
**Status:** ✅ Complete

