---
name: higgsfield-creative-director
description: |
  Creative director for SaaS product videos and viral Instagram/Reels concepts
  intended for Higgsfield generation. Use when planning homepage hero loops,
  product UI demos, feature walkthroughs, launch clips, viral reels, or when the
  user needs help deciding what video they want and translating that into a
  Higgsfield-ready creative brief, shot list, prompt, critique, and revision loop.
---

# Higgsfield Creative Director

This skill turns a vague video idea into a production-ready direction for Higgsfield.
It is a creative planning layer, not a generation runner.

Use the official Higgsfield skills as the execution layer:

- **`higgsfield-generate`** — run image/video generation, Marketing Studio, and Virality Predictor.
- **`higgsfield-product-photoshoot`** — create product imagery or source stills before video generation.
- **`higgsfield-soul-id`** — create or use a consistent human/founder/avatar identity.
- **`higgsfield-marketplace-cards`** — create marketplace/ecommerce card assets when relevant.

This skill should decide what to make, why it should work, and how to prompt it.
When the user is ready to generate, hand off to the relevant official Higgsfield
skill and verify the live model/schema before execution.

Use it for two lanes:

1. **SaaS Product Video Director** — homepage hero loops, UI demos, product proof,
   waitlist/launch demos, feature walkthroughs, screenshot-to-motion prompts.
2. **Viral Instagram/Reels Director** — hooks, UGC-style concepts, fast-cut launch
   clips, founder reels, pattern interrupts, caption-led short-form concepts.

Do not force every video into a calm premium style. Pick the vibe that fits the
platform, audience, and goal.

## Operating Rule

Work in this sequence:

```text
goal -> platform -> audience -> vibe mode -> concept -> shot list -> Higgsfield prompt -> official Higgsfield skill execution -> critique -> one-variable revision
```

Ask at most one or two clarifying questions if the missing decision changes the
video. Otherwise choose a sensible default and state it.

## Lane Router

Choose the lane before creating concepts.

| Signal | Lane |
|---|---|
| Website hero, landing page, waitlist page, product UI, app demo, feature walkthrough | SaaS Product Video |
| Instagram, Reels, TikTok, Shorts, viral, founder content, launch post, social hook | Viral Instagram/Reels |
| User wants both | Create one core concept, then two cuts: product-proof cut and social-hook cut |

## Vibe Modes

Pick one primary vibe. Do not mix more than two.

| Vibe | Best For | Motion Language | Avoid |
|---|---|---|---|
| `calm-premium` | homepage hero, enterprise trust, high-end product proof | slow push, subtle parallax, soft light, restrained callouts | hype captions, shaky UGC, busy transitions |
| `operator-polished` | serious SaaS demos, founder-led product launches | crisp UI motion, confident pacing, precise highlights | fake dashboard drama, overexplaining |
| `product-proof` | waitlist conversion, skeptical buyers, new AI products | real UI, before/after, visible outcome, clear action/result | abstract AI swirls, impossible features |
| `viral-ugc` | Instagram/Reels, founder content, social proof | handheld feel, direct hook, imperfect framing, punchy captions | sterile SaaS polish |
| `launch-hype` | launch announcement, big reveal, high-energy social clip | fast reveal, hard cuts, contrast, bold text beats | long setup, quiet pacing |
| `cinematic-brand` | brand teaser, atmospheric product story | music-led, metaphor, dramatic lighting, visual transformation | pretending the product UI does things it cannot do |

Default for Salt homepage hero: `operator-polished` or `product-proof`.
Default for Salt Instagram/Reels: `viral-ugc` or `launch-hype`.

## Creative Brief Intake

Extract or ask for:

- **Goal:** What should this video make the viewer do?
- **Platform:** homepage, landing page, Instagram/Reels, TikTok, YouTube Shorts, X, LinkedIn.
- **Audience:** who is this for?
- **Core promise:** the one thing they should understand in 3 seconds.
- **Proof moment:** what visible result proves the promise?
- **Source assets:** screenshots, product recordings, product URL, reference video, brand images.
- **Constraints:** duration, aspect ratio, no-go content, current product truth.

If the user is unsure, propose three directions and recommend one.

## Concept Output

Return 2-3 concepts before writing the final prompt.

Use this format:

```markdown
### Concept A — [Name]
- **Lane:** SaaS Product Video / Viral Instagram/Reels
- **Vibe:** [vibe mode]
- **Viewer takeaway:** [one sentence]
- **Opening hook:** [first 1-2 seconds]
- **Proof moment:** [what makes it believable]
- **Why this works:** [short rationale]
```

Recommend one concept. Do not proceed to a final prompt unless the user chooses or
the request clearly asks you to choose.

## Shot List Builder

For SaaS product videos, prefer real UI or staged product screenshots over invented
interfaces. For viral reels, the hook and pacing can be louder, but the product claim
must still be truthful.

Use this shot-list shape:

```markdown
## Shot List

1. **[0-2s] Hook**
   - Visual:
   - Motion:
   - Text/caption:
   - Purpose:

2. **[2-6s] Proof setup**
   - Visual:
   - Motion:
   - Text/caption:
   - Purpose:

3. **[6-10s] Product/result**
   - Visual:
   - Motion:
   - Text/caption:
   - Purpose:

4. **[10-12s] CTA or loop close**
   - Visual:
   - Motion:
   - Text/caption:
   - Purpose:
```

For homepage hero loops, make the end frame able to loop back to the start without
feeling like a hard reset.

## Higgsfield Prompt Builder

Use MCSLA adapted for product and social clips:

- **Model:** recommend the likely model/workflow, but verify live schema before execution.
- **Camera:** camera movement, framing, crop behavior.
- **Subject:** product UI, founder, product object, workflow state.
- **Look:** vibe mode translated into physical visuals.
- **Action:** what changes during the clip.

For image-to-video, do not re-describe the screenshot. Describe only motion,
attention guidance, and what should change.

### SaaS Screenshot-to-Motion Prompt Template

```text
Model: [Seedance 2.0 or Kling 3.0, verify before execution]
Aspect ratio: [16:9 for homepage, 9:16 for reels] | Duration: [4-15s]
Vibe: [vibe mode]

Starting from the provided product UI screenshot as the first frame.
The interface remains crisp and readable. The camera [slow push / slight parallax /
clean pan] toward [specific UI area]. A subtle highlight guides attention to
[proof moment]. [One visible state change: notification arrives / draft appears /
status changes / approval completes]. Motion is controlled and realistic.

Keep product text legible. Preserve the layout and UI geometry. No invented
screens, no extra app panels, no distorted typography, no random captions unless
specified.
```

### Viral Reels Prompt Template

```text
Model: [Seedance 2.0 / Marketing Studio / other verified model]
Aspect ratio: 9:16 | Duration: [8-15s]
Vibe: [viral-ugc / launch-hype / product-proof]

[Hook visual in first second]. [Subject] reacts to or demonstrates [problem].
Cut quickly to [product proof moment]. The pacing is [fast / punchy / direct],
with [caption style] emphasizing the core line: "[hook line]".
End on [specific outcome or CTA].

Keep the claim believable. Avoid generic AI effects. Preserve any product UI or
brand visuals exactly when reference images are provided.
```

## Critique Rubric

After a Higgsfield output exists, critique against the chosen lane and vibe.

Score 1-5:

- **Hook clarity:** does the first 1-2 seconds make the viewer care?
- **Product truth:** does it show a believable product behavior?
- **Readability:** is UI/text legible at target platform size?
- **Vibe match:** does motion match the selected vibe mode?
- **Conversion/shareability:** does it make the viewer want to sign up, ask, save, or share?
- **Artifact control:** are there distorted hands, warped UI, melting text, unwanted captions, or fake panels?

Then recommend exactly one next change. Do not change multiple variables at once.

```markdown
## Critique
- Hook clarity: /5
- Product truth: /5
- Readability: /5
- Vibe match: /5
- Conversion/shareability: /5
- Artifact control: /5

**Verdict:** keep / revise / regenerate from new still
**One-variable revision:** [the single change to try next]
```

## Salt-Specific Defaults

For Salt, favor:

- real product proof over abstract AI magic,
- `SEE -> ACT -> APPROVE` as the story spine when relevant,
- visible before/after business state,
- restrained claims,
- interface readability,
- no fake features or impossible automations.

Useful Salt proof frames:

- Salt notices a change across business context.
- Salt drafts the next action.
- Salt shows why it matters.
- Human approves.
- Work moves forward.

## What Not To Do

- Do not treat `calm-premium` as universal.
- Do not make every social video look like a homepage hero.
- Do not write generic cinematic prompts without a proof moment.
- Do not let Higgsfield invent a fake SaaS dashboard.
- Do not use broad terms like "epic", "beautiful", or "ultra-realistic" as a substitute for camera, light, subject, and action.
- Do not revise prompts by changing model, camera, style, and duration all at once.
