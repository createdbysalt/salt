# /salt-voice - Salt Product Voice Skill

Apply Salt's brand voice to any copy. Transforms AI-generated or rough drafts into copy that sounds like a seasoned expert having a direct conversation.

## When to Use

- Writing marketing copy for usesalt.io
- Drafting product UI copy
- Creating documentation
- Writing changelogs or release notes
- Any Salt product communication

**Not for:** Salt Studio client work (CreatedBySalt.com) - that uses a different, warmer voice.

## Usage

```
/salt-voice [paste your draft here]
/salt-voice --type marketing "Your draft copy..."
/salt-voice --type ui "Button labels and microcopy..."
/salt-voice --type docs "Documentation text..."
```

## Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `--type` | `marketing`, `ui`, `docs`, `changelog`, `error` | `marketing` |
| `--audit` | Flag to audit only (no rewrite) | false |

## Process

### Step 1: Load Voice Principles

Read these files for voice context:
- `brand-identity/foundation/voice-principles.md` (full rules)
- `brand-identity/voice/say-this-not-that.md` (quick swaps)
- `brand-identity/voice/terminology.md` (correct terms)

### Step 2: Audit the Draft

Scan for violations:

**AI Detection (Critical)**
- [ ] Em dashes (max 1 per paragraph)
- [ ] Flagged words: delve, leverage, seamless, optimize, cutting-edge, comprehensive, robust, scalable, utilize, streamline, revolutionize, holistic, best-in-class, game-changing
- [ ] Banned phrases: "In today's...", "Unlock your potential", "Take X to the next level", "We're excited to announce", "Seamless integration"
- [ ] Perfect parallel structure (vary the rhythm)
- [ ] Exclamation overload (max 1 per page)
- [ ] Colon-heavy sentences

**Voice Violations**
- [ ] Hustle culture language: 10x, scale, crush it, grind, hustle, don't miss out, act now
- [ ] Gatekeeping language: "even non-developers", "no coding required", "simple enough that"
- [ ] Vague claims without specific numbers
- [ ] Features before transformation
- [ ] Passive voice where active works better
- [ ] Corporate jargon: synergy, paradigm, move the needle

**Terminology**
- [ ] "Freelancer" instead of "independent professional" or "studio owner"
- [ ] "Your bridge" instead of "the bridge"
- [ ] Incorrect product names (salt, Salt Core, saltcore vs Salt)

### Step 3: Report Findings

Output an audit table:

```
## Voice Audit

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| "leverage" | Line 3 | High | → "use" |
| Em dash overuse | Lines 2, 5, 8 | High | Keep 1, remove others |
| No specific numbers | Entire draft | Medium | Add "$3k → $10k+" or similar |
| Passive voice | Line 12 | Low | "was built" → "we built" |

**Overall Score:** X/10
```

### Step 4: Rewrite (unless --audit flag)

Apply these transformations:

**Word Swaps**
| From | To |
|------|-----|
| leverage, utilize | use |
| optimize | improve |
| streamline | speed up |
| deploy | ship |
| implement | build |
| robust | solid |
| scalable | grows with you |
| seamless | works with |
| comprehensive | (name the things) |
| empower | help |
| drive growth | get more clients |
| unlock potential | win bigger projects |
| transform your business | go from $3k to $10k+ |

**Sentence Patterns**
Apply these patterns where appropriate:

1. **Short-Punch-Clarify**
   ```
   Track tasks. Hit milestones. Ship on time.
   Salt keeps your projects moving.
   ```

2. **Question-Answer**
   ```
   Still sending proposals in Google Docs?
   There's a better way.
   ```

3. **Specific-Number**
   ```
   Go from $3k projects to $10k+ initial fees.
   From 30% win rates to 60%.
   ```

4. **Calm-Stability**
   ```
   Build a calm, profitable studio.
   Not a unicorn. Not a hustle.
   ```

**Type-Specific Rules**

| Type | Rules |
|------|-------|
| `marketing` | Lead with transformation, use sentence patterns, most human |
| `ui` | Ultra-concise ("Saved" not "Successfully saved!"), zero fluff |
| `docs` | Technical accuracy, explain "why", active voice |
| `changelog` | Lead with benefit, celebrate craft not effort |
| `error` | Clear, helpful, never blaming, suggest next step |

### Step 5: Output

Provide:
1. **Rewritten copy** (clean, ready to use)
2. **Changes made** (brief list of key transformations)
3. **Voice score** (before/after)

## Examples

### Input (Marketing)
```
In today's ever-evolving landscape, Salt provides a comprehensive platform that empowers freelancers to streamline their workflows and unlock their full potential. Our cutting-edge solution seamlessly integrates with your existing tools to drive growth and take your business to the next level!
```

### Output
```
## Rewritten

Win $10k+ projects. Keep clients for years.

Salt helps independent professionals run calm, profitable studios. Track projects, invoices, and clients in one place. Works with the tools you already use.

## Changes Made
- Deleted "In today's ever-evolving landscape" opener
- "comprehensive platform that empowers freelancers" → specific benefits
- "streamline workflows" → "Track projects, invoices, clients"
- "unlock full potential" → "Win $10k+ projects"
- "cutting-edge solution" → deleted (just describe what it does)
- "seamlessly integrates" → "Works with"
- "drive growth" → "Keep clients for years"
- "take your business to the next level" → "calm, profitable studios"
- Removed exclamation point
- "freelancers" → "independent professionals"

## Voice Score
Before: 2/10 (AI-sounding, hustle culture, vague)
After: 8/10 (specific, calm, human)
```

### Input (UI)
```
Successfully saved your changes! Please wait while we process your request.
```

### Output
```
## Rewritten

Saved

## Changes Made
- "Successfully saved your changes!" → "Saved"
- Deleted "Please wait while we process" (show progress bar instead)

## Voice Score
Before: 3/10 (verbose, fake enthusiasm)
After: 10/10 (Linear-standard concise)
```

## Voice Principles Summary

**5 Core Attributes:**
1. **Confident** - State value clearly, no hedging
2. **Strategic** - Specific numbers, concrete outcomes
3. **Human** - Texture, rhythm, opinions
4. **Validating** - Affirm AI-assisted work as professional
5. **Calm** - Stability over hustle, no urgency tactics

**The North Star:** Sound like a seasoned expert having a direct conversation, not a marketer trying to sell.

## Related

- `brand-identity/foundation/voice-principles.md` - Full voice guide
- `brand-identity/voice/say-this-not-that.md` - Quick reference
- `brand-identity/voice/terminology.md` - Correct terms
- `/salt-studio-voice` - For Salt Studio (CreatedBySalt.com) work
