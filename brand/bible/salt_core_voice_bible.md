# SALT CORE Voice Bible

*This file defines how Salt Core speaks and writes. It is the canonical source of truth for product voice.*

---

## Core Voice

Confident, clear, and technically grounded without being intimidating. We speak like experienced creative technologists who respect both the craft of design and the precision of code.

---

## Brand Relationship

**Salt Core** is the product business that powers studios (including SALT Studio).  
**SALT Studio** is the client-facing studio brand.  
**The Bridge** is the client portal inside Salt Core.

**The voice relationship:**
- **Salt Core voice** (this document): Speaks to developers and designers who are building studios
- **SALT Studio voice** (separate bible): Speaks to end clients (churches, studios, startups, etc.)
- **The Bridge voice**: Professional, warm-neutral interface language (white-labelable)

---

## The Dual Audience Challenge

Salt Core serves two distinct but overlapping audiences:

### Traditional Developers
- **Background**: Code-first, systems thinking
- **Pain**: Tired of rebuilding auth/billing/infrastructure
- **Want**: Speed, solid architecture, technical depth
- **Fear**: Bloated abstraction that slows them down

### Designer-Developers (The Growth Segment)
- **Background**: Design-first, now coding with AI tools (Cursor, v0, etc.)
- **Pain**: Intimidated by "developer" tools and complex technical jargon
- **Want**: Beautiful systems that feel intuitive and creative
- **Fear**: Being exposed as "not a real developer"

**The voice must work for both audiences reading the same page.**

---

## Tone Spectrum

Adjust based on content type:

```
Technical  ←―――――•―――――→ Creative
Clinical   ←―――――•―――――→ Human  
Code-first ←――――•――――→ Experience-first
```

*Our sweet spot: Technically grounded, creatively aware, humanly direct*

**Context shifts:**
- **Marketing pages**: Lean slightly creative/human to welcome designers
- **Documentation**: More technical, but always explain the "why"
- **The Bridge interface**: Most human—this is what clients see

---

## Voice Principles

### 1. Clear Without Being Clinical

Technical truth matters, but so does human understanding.

**The approach:**
- Use technical terms developers know (Server Actions, webhooks, type-safe)
- Explain WHY it matters, not just WHAT it is
- Connect technical features to tangible outcomes

**Examples:**
- ❌ "Implements Server Actions for optimized data mutation"
- ❌ "Makes your app feel magical and fast"
- ✓ "Server Actions handle data updates instantly—no loading spinners, no page refreshes. Your clients see changes in real-time."

### 2. Strategic AND Beautiful

Acknowledge that systems thinking and aesthetic thinking aren't opposites—great studios need both.

**Language bridges:**
- "Architecture" = Systems + Aesthetics
- "Layer" = Structure that you can see and feel
- "Polish" = Both code quality AND interface refinement
- "Craft" = Whether you're crafting components or crafting code

**Examples:**
- ❌ "Our codebase is fully type-safe with a database ORM"
- ❌ "Beautiful interfaces that delight your clients"
- ✓ "The Bridge is built with the same obsessive attention to detail you bring to your design work—clean code, clean interface, zero compromise."

### 3. Empowering Without Gatekeeping

Never make designers feel like they're "playing developer." They're building real businesses.

**Avoid all "dumbing down" language:**
- ❌ "Even non-developers can use this"
- ❌ "You don't need to know code"
- ❌ "Perfect for beginners"

**Instead, use capability language:**
- ✓ "Built for studio owners who think in systems"
- ✓ "AI handles the syntax, you handle the strategy"
- ✓ "Whether you're shipping TypeScript or prompting Cursor, you're building the same thing: a professional studio"

**Core principle:** If you can design a system in Figma, you can understand the Salt Core architecture. Same thinking, different canvas.

### 4. Show Don't Tell (Layer for Both Audiences)

Structure content so both audiences can engage at their level.

**The strategy:**
- Lead with the visual/experiential (everyone can evaluate this)
- Follow with the technical foundation (developers can inspect deeper)
- Use progressive disclosure for technical details

**Example structure:**
```
[Visual: Screenshot of beautiful interface]

Client-facing outcome explained in clear language.

[Expandable section for developers:]
Technical implementation details, code examples, architecture decisions.
```

### 5. Outcome-Focused, Not Feature-Focused

Developers and designers both care about business results.

**Always connect features to outcomes:**
- Not: "Includes Stripe Connect integration"
- But: "Collect payments directly. Build recurring revenue. Take a percentage on growth retainers if you want."

**The outcomes that matter:**
- Ship faster (time savings)
- Charge more (revenue increase)
- Look professional (client perception)
- Build recurring revenue (business sustainability)
- Reduce stress (fewer client emails, automated reports)

---

## Sentence & Paragraph Structure

### General Writing

- Lead with the essential point, then expand
- Mix short, punchy sentences with flowing ones
- Use sentence fragments deliberately. For emphasis.
- Keep paragraphs brief (2-4 sentences)
- Single-sentence paragraphs create breaks and emphasis

### For Technical Content

- State the system/feature first
- Explain the business outcome second
- Provide the technical proof third (code, architecture, specs)
- Use bullet lists liberally—both audiences scan, not read

**Example:**
```
Layer 2: Intelligence (The Brain)

Multi-agent AI that crawls competitor data and generates brand positioning 
audits. This converts you from "coder for hire" to "strategic consultant."

That shift justifies $10k+ project minimums instead of $3k.

Technical foundation: Vercel AI SDK, Supabase pgvector, streaming responses.
```

### For The Bridge (Client-Facing)

- Keep it conversational and warm
- Lead with status/outcome, not technical process
- Remove all developer jargon
- Think: "What does the client actually care about?"

---

## Word Choice

### Universal Language (Use Liberally)

**Systems words that work for both audiences:**
- Architecture, layer, foundation, structure
- Intentional, considered, refined, opinionated
- Studio, craft, professional, production-ready
- Ship, launch, build, create, deploy

**Bridge words (design + dev):**
- Interface + API
- Visual + Technical  
- Polish + Performance
- Experience + Infrastructure

**Outcome words (everyone cares):**
- Client-ready, production-quality
- Real-time, instant, seamless
- Professional, scalable, maintainable
- Revenue, margin, MRR, retainer

### Developer-Specific Language (Use Strategically)

**Safe to use (most designers now understand):**
- Server Actions, webhooks, API
- Type-safe, schema, migration
- Component, route, deployment
- Auth, database, hosting

**Use with brief context:**
- Database queries → "Database queries (safe, type-aware access to your data)"
- RLS → "Row Level Security (RLS) ensures clients only see their data"
- Middleware → "Middleware (code that runs before requests)"

**Avoid without explanation:**
- Polymorphic relations, discriminated unions
- Tree-shaking, code splitting (unless in advanced docs)
- Raw technical acronyms (CORS, CSRF, JWT) without context

### Language to Avoid

**Too technical (alienates designers):**
✗ Dense jargon without context
✗ Assuming knowledge of advanced patterns
✗ Code snippets without explaining what they do

**Too fluffy (developers roll their eyes):**
✗ "Magical," "delightful," "game-changing"
✗ "Empowers your creative journey"
✗ Design metaphors without substance

**Too gatekeep-y (excludes anyone):**
✗ "For serious developers only"
✗ "Enterprise-grade" (intimidating and corporate)
✗ "If you don't understand X, this isn't for you"

**Marketing jargon (everyone hates this):**
✗ "Solutions" — too vague and corporate
✗ "Leverage" — pretentious
✗ "Innovative," "revolutionary," "cutting-edge"
✗ "Best practices" — lazy thinking
✗ "Synergy," "ideate," "circle back"

---

## Formatting Rules

### Headers & Subheaders

- Use sentence case, not title case
- Be descriptive and scannable (both audiences are scanners)
- Technical terms in headers are fine when appropriate
- Format: "Layer 1: Infrastructure (The Engine)" not "Building Your Foundation"

**Good:**
- "The Intelligence Layer: AI-powered strategy generation"
- "Setting up Stripe Connect"
- "How The Bridge handles client requests"

**Avoid:**
- "Unleashing the Power of AI"
- "Getting Started" (too vague)
- "Magic Happens Here"

### Code & Technical Specs

**For developers:**
- Use code blocks with syntax highlighting
- Show file paths: `/src/features/auth/actions.ts`
- Include inline comments in code examples
- Link to relevant documentation

**For mixed audiences:**
- Explain what the code does before showing it
- Use progressive disclosure (collapsed technical details)
- Provide the "why" not just the "what"

**Example:**
```
The authentication flow uses Auth.js v5 with Supabase as the database adapter.

[See the implementation ↓]

```typescript
// Code example here
```
```

### Lists & Bullets

**Use bullets for:**
- Features and capabilities
- Benefits and outcomes
- Options and configurations
- Scannable information

**Use numbered lists for:**
- Sequential processes (setup steps, migration workflow)
- Ordered priorities
- Step-by-step tutorials

**List formatting rules:**
- Keep items parallel (all start with verbs, or all are nouns)
- Keep list items under 2 lines when possible
- Use sub-bullets sparingly

### Emphasis & Punctuation

**Bold:**
- Section intros or key concepts
- Important warnings or notes
- Feature names when first introduced

**Italics:**
- Subtle emphasis within sentences
- Technical terms being defined
- Occasional voice inflection

**Em dashes (—):**
- For adding depth or technical clarification
- Example: "Server Actions—code that runs on the server—handle all data mutations"

**Avoid:**
- ALL CAPS (except for SALT CORE or brand names)
- Excessive exclamation points!!
- Ellipses... (feels uncertain or trailing)

---

## Audience-Specific Voice

### For Developers

**What they care about:**
- Stack quality and technical decisions
- Time-to-ship and avoiding technical debt
- Control and customization (not being locked in)
- Proof that it won't slow them down

**Voice adjustments:**
- More peer-to-peer, less explanatory
- Show code examples and architecture diagrams
- Acknowledge tradeoffs honestly
- Link to technical documentation

**Example:**
> "Salt Core ships with a secure, production-ready database setup from day one. We’ll evolve the data layer based on real product needs—without forcing disruptive migrations mid-project."

**What they respect:**
- Honest technical tradeoffs
- Clear architecture decisions
- Performance metrics
- Open acknowledgment of what's opinionated vs. configurable

### For Designers/Creative Developers

**What they care about:**
- Interface quality and user experience
- Not feeling stupid or excluded
- Creative control and brand expression
- Business outcomes (charging more, looking professional)

**Voice adjustments:**
- Lead with visual/experiential outcomes
- Explain the "why" behind technical choices
- Use analogies to design systems thinking
- Celebrate their design skills while building confidence in technical capability

**Example:**
> "If you can design a component system in Figma with variants, tokens, and auto-layout, you already think in the same patterns Salt Core uses. The only difference is the canvas—design systems use Figma, Salt Core uses Next.js."

**What they need:**
- Validation that they're capable
- Clear explanations without condescension
- Beautiful examples they can evaluate visually
- Confidence that the technical foundation is solid (so they can focus on design)

### For End Clients (The Bridge Interface)

**What they care about:**
- Is their project on track?
- What's happening right now?
- Can they trust their developer?
- Is their investment worth it?

**Voice adjustments:**
- Shift to warm, clear, professional
- Zero technical jargon
- Focus entirely on outcomes and status
- Make them feel informed and in control

**Example:**
> "Your site is live and performing well. This month: 2,847 visitors, up 23% from last month. The SEO strategy we implemented is working—your site now ranks for 12 new search terms."

---

## Do's and Don'ts

### Do's

**Language:**
✓ Use "we" and "you" to create connection
✓ Address both technical and creative audiences in the same content
✓ Show the beautiful outcome first, technical foundation second
✓ Quantify everything (80% faster, $10k projects, 200ms response time)
✓ Acknowledge complexity when something is genuinely complex
✓ Use analogies that bridge design and development thinking
✓ Admit tradeoffs honestly (ship a safe default now, evolve later)

**Structure:**
✓ Lead with outcomes, support with technical proof
✓ Use progressive disclosure for technical depth
✓ Layer content for multiple audience levels
✓ Show screenshots and visual examples
✓ Link to documentation for deeper exploration
✓ End sections with clear next actions

**Tone:**
✓ Be confident without being arrogant
✓ Be technical without being intimidating
✓ Be inclusive without being patronizing
✓ Celebrate both design craft and code craft equally
✓ Speak to capability, not skill level

### Don'ts

**Language to Avoid:**
✗ Any "dumbing down" language about designers
✗ Any gatekeeping language about "real developers"
✗ Marketing jargon (solutions, leverage, innovative, synergy)
✗ Apologizing for technical complexity
✗ Excessive hedging that sounds uncertain

**Structural Mistakes:**
✗ Leading with technical details before showing outcomes
✗ Walls of code without context
✗ Assuming knowledge without providing context
✗ Hiding important information in collapsed sections
✗ Making designers hunt for "is this for me?" validation

**Tonal Errors:**
✗ Talking down to designers entering development
✗ Oversimplifying for developers (they'll lose respect)
✗ Being cute or clever at the expense of clear
✗ Using technical superiority as a flex
✗ Separating "developers" and "designers" as if they're different species
✗ Apologizing for being technical

---

## Known Pitfalls & Edge Cases

### The Technical Depth Paradox

**Pitfall**: Making content too simple alienates developers; making it too technical alienates designers.

**Why It Happens**: Fear of losing one audience, so you pick one or water it down for both.

**Better Approach**: Layer the content. Lead with the universal outcome, then provide depth for those who want it.

**Example:**
```
✗ "Our advanced type-safe ORM with migration capabilities..."
✗ "An easy-to-use database tool that anyone can understand..."
✓ "Your database layer is built for safety and clarity—secure access patterns, clear schema evolution, and a setup that can grow with the product. [See the schema structure →]"
```

### The "Real Developer" Problem

**Pitfall**: Accidentally reinforcing that designers who code with AI aren't "real developers."

**Why It Happens**: Traditional developer language often has gatekeeping baked in.

**Better Approach**: Treat everyone as a studio owner who needs technical capability. The path to that capability doesn't matter.

**Examples:**
- ✗ "Even if you're not a developer..."
- ✗ "For actual developers, we also have..."
- ✓ "Whether you're writing TypeScript or prompting Cursor, Salt Core gives you the same professional foundation"
- ✓ "Studio owners don't need to write every line of code—they need to ship professional work"

### The Oversimplification Trap

**Pitfall**: Trying so hard to be accessible that you strip away substance and credibility.

**Why It Happens**: Fear of intimidating the designer audience.

**Better Approach**: Complexity is fine. Unnecessary jargon isn't. Explain genuinely complex things honestly.

**Example:**
- ✗ "We handle all the boring technical stuff so you don't have to worry about it!"
- ✓ "Authentication, billing, email, and database setup are already configured. You start at 80% complete and customize the final 20% for each client."

### The Creative vs. Technical False Binary

**Pitfall**: Treating design and development as opposing forces instead of complementary crafts.

**Why It Happens**: Traditional industry divisions.

**Better Approach**: Speak to "systems thinking" that encompasses both. Designers create visual systems; developers create code systems. Salt Core is a business system.

**Examples:**
- ✗ "For the creative types, don't worry about the code..."
- ✗ "Developers will appreciate the architecture, while designers will love the UI..."
- ✓ "Salt Core is opinionated about structure the same way you're opinionated about design systems—everything has a place, everything has a reason"

### The AI Tool Dismissiveness

**Pitfall**: Implying that using AI tools is somehow "less than" hand-coding.

**Why It Happens**: Traditional developer culture values "doing it yourself."

**Better Approach**: AI tools are just tools. What matters is shipping professional work.

**Examples:**
- ✗ "Even if you just use AI to code..."
- ✗ "For those who actually write code by hand..."
- ✓ "Cursor, v0, and Claude are incredible tools for shipping code. Salt Core gives you the foundation they build on top of."

### The Metric Overload Problem

**Pitfall**: Drowning the message in performance metrics and technical benchmarks that only hardcore developers care about.

**Why It Happens**: Trying to prove technical credibility.

**Better Approach**: Use metrics strategically. Business metrics (time saved, revenue potential) work for everyone. Technical metrics (bundle size, response time) should be secondary.

**Examples:**
- ✗ "Achieves 98+ Lighthouse scores with 0kb client-side JavaScript on marketing pages through aggressive tree-shaking and server component utilization..."
- ✓ "Your landing pages load instantly because Salt Core uses server components—your clients see content immediately, your developer tools show perfect performance scores"

---

## The Bridge Voice (Client-Facing)

Since The Bridge is inside Salt Core but client-facing, it needs its own voice considerations:

### Core Principle
The Bridge makes your studio look professional, regardless of whether you're a solo developer or designer.

### Voice Characteristics
- **Warm but professional** (not corporate, not casual)
- **Clear and reassuring** (clients feel informed, not anxious)
- **Outcome-focused** (they see progress and value)
- **Zero technical jargon** (unless explaining something they asked about)

### Example Bridge Language

**Project status update:**
> "Your homepage redesign is complete and live. This week we also optimized your site speed—pages now load 40% faster than before."

**AI-generated report:**
> "Your SEO strategy is working. This month your site ranked for 12 new search terms and organic traffic increased by 23%."

**Task confirmation:**
> "Got it. We'll update the pricing section on your services page. You'll see the change live within 24 hours."

**Not this:**
> "Deployment pipeline executed successfully. Server-side rendering optimizations implemented. Awaiting QA approval."

---

## Voice Checklist

Before publishing any Salt Core content, ask:

### Audience Check
- [ ] Would a traditional developer respect this?
- [ ] Would a designer-developer feel included?
- [ ] Is there a path for both audiences to understand the value?
- [ ] Did I avoid gatekeeping language?
- [ ] Did I avoid "dumbing down" language?

### Content Check
- [ ] Does this lead with outcomes before technical details?
- [ ] Are technical terms either explained or contextually clear?
- [ ] Did I quantify the benefits (time, money, quality)?
- [ ] Is the next action clear?
- [ ] Would I be excited reading this?

### Tone Check
- [ ] Is this confident without being arrogant?
- [ ] Is this technical without being intimidating?
- [ ] Is this clear without being condescending?
- [ ] Did I avoid marketing jargon?
- [ ] Does this sound like Salt Core (not generic SaaS copy)?

### Brand Alignment
- [ ] Does this position Salt Core as a professional system?
- [ ] Does this respect both design craft and code craft?
- [ ] Is SALT Studio mentioned appropriately (as proof, not as main focus)?
- [ ] If this is Bridge content, does it use client-appropriate language?

---

## Channel-Specific Guidance

### Product Pages (SaltCore.io)
- Lead with visual outcomes and business results
- Layer technical details progressively
- Show screenshots of both the code and The Bridge
- End with clear calls to action

### Documentation
- Be more technical, but always explain why
- Use code examples with comments
- Provide both quick-start and deep-dive paths
- Link between related concepts

### Email (to developers/users)
- Get to the point immediately
- Use bullet lists for updates
- Include relevant links
- End with single clear action

### The Bridge (client interface)
- Use warm, professional language
- Focus entirely on client outcomes
- No technical jargon
- Keep it scannable and clear

---

**Last Updated**: December 27, 2025  
**Owner**: Gabriella Martins  
**Questions or Suggestions**: Review with Gabriella before making changes to this document.
