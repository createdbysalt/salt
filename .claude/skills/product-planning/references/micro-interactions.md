# Micro-Interactions

## Source
Dan Saffer, "Microinteractions"

## The Concept

Micro-interactions are the small, contained moments that accomplish a single task. They're the details that:
- Make products feel alive and responsive
- Create emotional connection
- Distinguish great products from good ones
- Often go unnoticed when done well, but are missed when absent

## The Structure

Every micro-interaction has four parts:

### 1. Trigger
What initiates the interaction?
- User action (click, hover, swipe)
- System event (notification, completion)

### 2. Rules
What happens during the interaction?
- The logic and constraints
- What changes and how

### 3. Feedback
How does the user know what's happening?
- Visual changes
- Sound
- Haptics

### 4. Loops & Modes
Does the interaction repeat or change over time?
- Loading states
- Persistent preferences

## Key States to Specify

| State | Description | Design Goal |
|-------|-------------|-------------|
| **Default** | At rest | Clear, inviting |
| **Hover** | Mouse over (desktop) | Responsive, alive |
| **Focus** | Keyboard navigation | Accessible, visible |
| **Active/Pressed** | During click/tap | Immediate feedback |
| **Loading** | Waiting for response | Progress, not stuck |
| **Success** | Action completed | Accomplishment, joy |
| **Error** | Something went wrong | Guided, not blamed |
| **Empty** | No data/content | Opportunity, not broken |
| **Disabled** | Can't interact | Clear why, not frustrating |

## Specifying Micro-Interactions

For each key interaction, document:

```markdown
### [Interaction Name]

| State | Behavior | Duration | Intended Feeling |
|-------|----------|----------|------------------|
| Default | [Description] | - | [Emotion] |
| Hover | [Description] | 150ms | [Emotion] |
| Active | [Description] | 50ms | [Emotion] |
| Loading | [Description] | Indeterminate | [Emotion] |
| Success | [Description] | 300ms | [Emotion] |
| Error | [Description] | 200ms | [Emotion] |
```

## Examples

### Button Click
| State | Behavior | Feeling |
|-------|----------|---------|
| Default | Solid fill, clear label | Ready to act |
| Hover | Subtle brightness increase | Responsive |
| Active | Brief scale down (98%) | Tactile feedback |
| Loading | Spinner replaces label, disabled | Progress |
| Success | Checkmark briefly, then next state | Accomplished |

### Form Submission
| State | Behavior | Feeling |
|-------|----------|---------|
| Typing | Inline validation as you go | Guided |
| Submit | Button loading state | Progress |
| Success | Form fades, success message slides in | Celebration |
| Error | Scroll to first error, highlight field | Directed |

### Data Loading
| State | Behavior | Feeling |
|-------|----------|---------|
| Initial | Skeleton UI matching final layout | Anticipation |
| Partial | Progressive content reveal | Progress |
| Complete | Subtle fade in | Seamless |
| Error | Inline error with retry option | Recoverable |

## Timing Guidelines

| Interaction Type | Duration | Notes |
|-----------------|----------|-------|
| Immediate feedback | 50-100ms | Button press, hover |
| Short transition | 150-200ms | Menu open, tooltip |
| Medium animation | 200-300ms | Modal, page transition |
| Long animation | 300-500ms | Complex reveals |
| Celebration | 500-1000ms | Success moments |

**Rule:** If it feels slow, it's too slow. When in doubt, faster.

## The "Back of the Fence" Details

Micro-interactions users may never consciously notice:

- Consistent easing curves across all animations
- Skeleton UI that exactly matches loaded state
- Focus rings that match brand colors
- Error messages with helpful next steps
- Loading states that don't cause layout shift
- Disabled states that explain why

These create the feeling of quality without being able to point to any one thing.

## Application in Salt-Core

### In `/solution`
Specify micro-interactions for key moments:
```markdown
## Micro-Interactions

| Interaction | State | Behavior | Feeling |
|-------------|-------|----------|---------|
| Book meeting | Success | Smooth fade to confirmation, gentle checkmark animation | Accomplished |
| Book meeting | Error | Shake animation, inline message | Guided, not blamed |
```

### In `/prd`
Include micro-interaction tables in user stories:
```markdown
**Micro-Interactions:**
| State | Behavior |
|-------|----------|
| Loading | Skeleton preserves layout |
| Success | Fade in with subtle scale |
| Error | Highlight field, scroll to it |
```

## Anti-Patterns

**❌ No feedback:** Clicking and nothing happens. Users wonder if it worked.

**❌ Too much animation:** Every element bouncing and sliding. Overwhelming.

**❌ Inconsistent timing:** Fast here, slow there. Feels janky.

**❌ Layout shift:** Content jumping around as things load. Frustrating.

**❌ Generic states:** Same error message everywhere. Not helpful.

## Key Quote

> "The difference between a product you like and a product you love is the details."
> — Dan Saffer
