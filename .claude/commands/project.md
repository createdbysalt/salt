# /project - Project Orchestration Command

## Purpose
Initialize, manage, and coordinate full client projects. Acts as the command center for the entire strategy-to-handoff workflow.

## When to Use
- Starting a new client project
- Checking project status
- Determining next steps
- Coordinating between phases
- Preparing for client handoff
- Resolving blockers

## Usage

```
/project [action] [client name or details]
```

### Actions

| Action | Purpose | Example |
|--------|---------|---------|
| `new` | Initialize a new project | `/project new GreenLeaf Organics` |
| `status` | Check current status | `/project status GreenLeaf` |
| `next` | Get next recommended action | `/project next GreenLeaf` |
| `handoff` | Prepare handoff package | `/project handoff GreenLeaf` |
| `blockers` | List and address blockers | `/project blockers GreenLeaf` |
| `list` | Show all active projects | `/project list` |

---

## Workflow: New Project

### Command
```
/project new [Client Name]
```

### Process

**Step 1: Initialize**
```
1. Create project folder structure
2. Generate project ID (slugified client name)
3. Initialize status tracking file
4. Set created date
```

**Step 2: Assess Inputs**
```
Questions to ask:
- Intake form / questionnaire available?
- Existing brand guidelines?
- Inspiration / reference sites?
- Access to client for clarifying questions?
- Known timeline or deadlines?
```

**Step 3: Determine Starting Point**
```
Standard flow: Start with /discover
Exceptions:
- If Client DNA exists → Can skip to /icp
- If references provided → /brief can run parallel
```

**Step 4: Provide First Action**
```
Clear next step with:
- Specific command to run
- What inputs are needed
- What outputs to expect
```

### Example Output

```
## New Project: GreenLeaf Organics

### Project Initialized
- **ID:** greenleaf-organics
- **Created:** January 17, 2026
- **Status:** 🆕 Starting

### Folder Structure Created
```
projects/greenleaf-organics/
├── _project_status.json
├── inputs/
└── outputs/
    ├── 1_discovery/
    ├── 2_audience/
    ├── 3_architecture/
    ├── 4_design/
    └── 5_review/
```

### Input Assessment

Before starting Discovery, I need to know:

1. **Intake Form:** Do you have a completed client questionnaire?
2. **Brand Materials:** Any logo, colors, guidelines, or existing site?
3. **Inspiration:** Has the client shared reference sites they like?
4. **Timeline:** Any deadlines I should know about?

What materials are available for GreenLeaf?
```

---

## Workflow: Status Check

### Command
```
/project status [Client Name]
```

### Process

**Step 1: Load Project State**
```
- Read _project_status.json
- Scan output folders for files
- Verify outputs match recorded state
```

**Step 2: Assess Each Phase**
```
For each phase:
- Status: not_started | in_progress | complete | blocked
- Outputs: List generated files
- Quality: Quick assessment
- Blockers: Any issues preventing progress
```

**Step 3: Provide Summary**
```
- Overall progress (X/5 phases)
- Current phase status
- Blockers (if any)
- Next recommended action
```

### Example Output

```
## Project Status: GreenLeaf Organics

**Progress:** ████████░░ 4/5 phases complete
**Current Phase:** Review
**Status:** 🟢 On Track

### Phase Summary

| Phase | Status | Key Outputs |
|-------|--------|-------------|
| Discovery | ✅ Complete | Client DNA, Brand Voice |
| Audience | ✅ Complete | 2 ICP Profiles, Journey Map |
| Architecture | ✅ Complete | 14-page Sitemap, Page Briefs |
| Design | ✅ Complete | Visual System, Component Specs |
| Review | 🔄 In Progress | Audit started |

### Current Activity
Running conversion audit on all outputs.

### Blockers
None

### Next Action
Complete `/review` then proceed to handoff preparation.

### Files Generated
- 11 deliverable files across 5 phases
- All quality gates passed
```

---

## Workflow: Next Action

### Command
```
/project next [Client Name]
```

### Process

**Step 1: Assess Current State**
```
- Which phases are complete?
- Which are blocked?
- What's the critical path?
```

**Step 2: Determine Next Action**
```
Decision tree:
1. If Discovery incomplete → /discover
2. If ICP incomplete and Discovery done → /icp
3. If Strategy incomplete and ICP done → /strategy
4. If Design incomplete and references available → /brief
5. If all phases complete but no review → /review
6. If review complete → /project handoff
```

**Step 3: Provide Specific Guidance**
```
- Exact command to run
- Any inputs needed first
- Expected output
- Estimated time
```

### Example Output

```
## Next Action: GreenLeaf Organics

### Current State
- Discovery ✅
- Audience ✅
- Architecture ✅
- Design ⏳ Blocked (waiting on references)
- Review ⏳ Not started

### Recommended Action

**Option A: Address Blocker**
Design is waiting on inspiration references. Request from client:
> "Please share 2-3 websites with aesthetics you'd like us to reference."

**Option B: Parallel Track**
While waiting for references, run conversion review on strategy work:

```
/review Audit GreenLeaf sitemap and page briefs
```

This validates the architecture while design inputs are gathered.

### Recommendation
Run Option B to keep momentum. Design can catch up once references arrive.

**Command to run:**
```
/review Audit GreenLeaf strategy outputs
```
```

---

## Workflow: Handoff Preparation

### Command
```
/project handoff [Client Name]
```

### Process

**Step 1: Pre-Flight Check**
```
Verify all phases complete:
□ Discovery outputs exist and valid
□ Audience outputs exist and valid
□ Architecture outputs exist and valid
□ Design outputs exist and valid
□ Review complete with issues addressed
```

**Step 2: Quality Verification**
```
□ No placeholder content
□ No TODO items
□ Consistent naming throughout
□ No contradictions between documents
□ All critical issues resolved
```

**Step 3: Generate Handoff Package**
```
Create:
1. Executive summary
2. Organized deliverables folder
3. Key decisions document
4. Open questions list
5. Recommendations for next phase
```

**Step 4: Final Checklist**
```
□ All files in handoff folder
□ Naming convention client-friendly
□ No internal notes/comments exposed
□ Summary document complete
□ Ready for client presentation
```

### Example Output

```
## Handoff Package: GreenLeaf Organics

### Pre-Flight Check ✅

| Phase | Status | Files |
|-------|--------|-------|
| Discovery | ✅ | 3 files |
| Audience | ✅ | 3 files |
| Architecture | ✅ | 3 files |
| Design | ✅ | 3 files |
| Review | ✅ | 1 file |

**Total Deliverables:** 13 files

### Quality Verification ✅

- Placeholder content: None found
- TODO items: None found
- Naming consistency: Passed
- Cross-reference check: Passed
- Critical issues: All resolved

### Handoff Package Created

```
handoff/greenleaf-organics/
├── 00_executive_summary.md
├── 01_strategy/
│   ├── client_dna.json
│   ├── brand_voice.json
│   ├── icp_profiles.json
│   └── user_journey.json
├── 02_architecture/
│   ├── strategic_sitemap.json
│   ├── page_briefs.json
│   └── content_requirements.json
├── 03_design/
│   ├── design_brief.json
│   ├── visual_system.json
│   └── component_specs.json
└── 04_quality/
    └── conversion_audit.json
```

### Summary Statistics

- **Conversion Readiness Score:** 8.2/10
- **Pages Defined:** 14
- **ICP Profiles:** 2
- **Components Specified:** 23
- **Issues Found & Resolved:** 7

### Open Questions for Client

1. Final decision on hero photography style (Option A vs B)
2. Confirm subscription model pricing tiers
3. Approve color accessibility adjustments

### Ready for Presentation ✅

Handoff package is client-ready. All deliverables are organized
and documented for design/development team consumption.
```

---

## Workflow: Blocker Resolution

### Command
```
/project blockers [Client Name]
```

### Process

**Step 1: Identify All Blockers**
```
Scan for:
- Missing inputs
- Incomplete prerequisites
- Quality issues requiring revision
- External dependencies
- Client decisions needed
```

**Step 2: Categorize**
```
Types:
- Missing Information → Need client input
- Missing Prerequisite → Need previous phase
- Quality Issue → Need revision
- External → Need third party
- Decision → Need stakeholder call
```

**Step 3: Provide Resolution Path**
```
For each blocker:
- What specifically is blocked
- What's needed to unblock
- Who needs to take action
- Workaround (if available)
- Impact of delay
```

### Example Output

```
## Blockers: GreenLeaf Organics

### Active Blockers: 2

---

#### Blocker 1: Missing Design References
**Blocking:** Design phase (/brief)
**Type:** Missing Information

**What's Needed:**
Client needs to provide 2-3 reference websites for design inspiration.

**Suggested Request to Client:**
> "To develop the design direction, please share 2-3 websites with 
> visual styles you admire. These don't need to be competitors—
> we're looking at aesthetics, not content."

**Workaround:**
Can proceed with research-based assumptions and mark for client confirmation.

**Impact of Delay:**
Design phase cannot produce high-confidence output without references.

---

#### Blocker 2: Pricing Decision Pending
**Blocking:** Page briefs completion (pricing page)
**Type:** Client Decision

**What's Needed:**
Client needs to confirm pricing tier structure:
- Option A: Free / Pro / Enterprise
- Option B: Starter / Growth / Scale

**Suggested Request:**
> "Which pricing structure would you like to proceed with?
> This affects the pricing page design and comparison table."

**Workaround:**
Can design pricing page template with placeholder tiers.

**Impact of Delay:**
Minor—template can proceed, specific values updated later.

---

### Recommended Actions

1. **Send reference request to client** (High priority)
2. **Proceed with pricing template** (Use placeholder)
3. **Continue strategy work** (Not blocked)

Would you like me to draft the client communication?
```

---

## Workflow: List Projects

### Command
```
/project list
```

### Example Output

```
## Active Projects

| Project | Phase | Progress | Status | Last Updated |
|---------|-------|----------|--------|--------------|
| GreenLeaf Organics | Design | ████████░░ 4/5 | 🟢 On Track | Today |
| TechFlow SaaS | Architecture | ██████░░░░ 3/5 | 🟡 Blocked | Yesterday |
| Bella's Bakery | Discovery | ██░░░░░░░░ 1/5 | 🟢 On Track | 3 days ago |

### Quick Actions

**GreenLeaf:** Ready for `/review`
**TechFlow:** Needs client input on ICP priorities
**Bella's:** Ready to run `/icp`

Which project would you like to focus on?
```

---

## Quality Gates

The creative-director enforces quality gates between phases:

### Discovery → Audience Gate
```
□ Client DNA has primary conversion goal defined
□ Brand voice has measurable dimensions
□ No critical "Unknown" fields
```

### Audience → Architecture Gate
```
□ At least 1 ICP profile complete
□ Awareness levels mapped
□ Key objections documented
```

### Architecture → Design Gate
```
□ Sitemap has all core pages
□ Page briefs define clear purposes
□ Conversion paths traceable
```

### Design → Review Gate
```
□ Typography system defined
□ Color system with accessibility
□ Component specs for key elements
```

### Review → Handoff Gate
```
□ No critical issues unresolved
□ High issues documented
□ Conversion score ≥7/10
```

---

## Integration

### Uses All Agents
```
/discover → client-discovery
/icp      → icp-analyst
/strategy → ux-strategist
/brief    → design-translator
/review   → conversion-reviewer
```

### Coordinates Outputs
```
Discovery outputs → ICP inputs
ICP outputs → Strategy inputs
Strategy + Voice → Design inputs
All outputs → Review inputs
Reviewed outputs → Handoff
```

### Tracks State
```
_project_status.json maintains:
- Phase completion status
- Output file inventory
- Blockers and notes
- Timeline tracking
```