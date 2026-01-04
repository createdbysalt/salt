# Personalized Dashboard Greetings

*User-contextual greetings for Salt Core dashboard pages*

---

## Philosophy

Dashboard greetings should:
- **Be contextually aware** (time of day, user activity, page purpose)
- **Feel personal without being intrusive** (warm, not clingy)
- **Make users smile** (light-hearted, occasionally playful)
- **Respect the professional context** (fun but never unprofessional)
- **Stay fresh** (rotate to avoid repetition fatigue)

### Voice Alignment

These greetings follow Salt Core's voice principles:
- Confident without being arrogant
- Human without being overly casual
- Creative without sacrificing clarity
- Empowering without gatekeeping

---

## Research: What Others Do

### Claude AI
- **Pattern**: Time-based + name + subtle context
- **Examples**: 
  - "Good evening, Gabriella"
  - "Welcome back, Gabriella"
- **What works**: Simple, warm, human acknowledgment
- **What we'll improve**: Add page-specific context and occasional personality

### Linear
- **Pattern**: Contextual status updates
- **Examples**:
  - "12 issues assigned to you"
  - "3 cycles in progress"
- **What works**: Outcome-focused, action-oriented
- **What we'll improve**: Warmer tone, more personal

### Notion
- **Pattern**: Motivational + contextual
- **Examples**:
  - "Good morning! Ready to make progress?"
  - "What will you create today?"
- **What works**: Aspirational without being cheesy
- **What we'll improve**: More specific to studio work

### Superhuman (Email)
- **Pattern**: Achievement-focused
- **Examples**:
  - "You're all caught up!"
  - "5 minutes until inbox zero"
- **What works**: Celebrates user progress
- **What we'll improve**: Apply to project/client context

### Height (Project Management)
- **Pattern**: Team-aware context
- **Examples**:
  - "Your team shipped 12 tasks this week"
  - "2 blockers need your attention"
- **What works**: Collaborative framing
- **What we'll improve**: More studio-specific

---

## Implementation Strategy

### Format
```
[Time-based greeting], [User first name] — [contextual phrase]
```

### Components

**Time-based greetings:**
- 5am-11am: "Good morning"
- 12pm-5pm: "Good afternoon" 
- 6pm-11pm: "Good evening"
- 12am-4am: "Burning the midnight oil" / "Late night session"

**Contextual phrases:**
- Should relate to the page purpose
- Rotate randomly to stay fresh
- Occasionally celebrate user progress
- Sometimes just acknowledge the moment

---

## Page-by-Page Greetings

### Overview Page
*Purpose: High-level studio health and activity*

**Default patterns:**
1. `Good morning, [Name] — Your studio is looking good`
2. `Good afternoon, [Name] — Time to check the pulse`
3. `Good evening, [Name] — Let's wrap up the day`
4. `Welcome back, [Name] — Here's what's happening`

**Activity-aware (if data available):**
- `Good morning, [Name] — 3 projects active, 2 clients happy`
- `Good evening, [Name] — Solid day. 8 tasks completed`
- `Hey [Name] — Your studio shipped 12 things this week` (Friday afternoon)
- `Good morning, [Name] — Fresh week, fresh start` (Monday morning)

**Occasional playful:**
- `Good morning, [Name] — Coffee first, then metrics`
- `Good afternoon, [Name] — The studio is humming along nicely`
- `Good evening, [Name] — Another day of building great things`

---

### Clients Page
*Purpose: Managing client relationships*

**Default patterns:**
1. `Good morning, [Name] — Your clients are in good hands`
2. `Good afternoon, [Name] — Time to check in on everyone`
3. `Good evening, [Name] — All clients accounted for`
4. `Hey [Name] — Who needs attention today?`

**Activity-aware:**
- `Good morning, [Name] — 2 active projects, zero fires` (ideal state)
- `Good afternoon, [Name] — 3 clients messaged this week` (recent activity)
- `Hey [Name] — Acme Corp's project just went live` (recent milestone)

**Contextual & encouraging:**
- `Good morning, [Name] — Strong relationships = strong business`
- `Good afternoon, [Name] — Quality over quantity, always`
- `Good evening, [Name] — You've got a great roster here`

**Occasional playful:**
- `Hey [Name] — Building relationships, not just websites`
- `Good morning, [Name] — The best clients are repeat clients`
- `Good afternoon, [Name] — Your client game is strong`

---

### Projects Page
*Purpose: Managing active work*

**Default patterns:**
1. `Good morning, [Name] — Let's ship some work`
2. `Good afternoon, [Name] — Projects are looking solid`
3. `Good evening, [Name] — Everything on track`
4. `Hey [Name] — What are we building today?`

**Activity-aware:**
- `Good morning, [Name] — 4 projects in flight, 2 launching soon`
- `Good afternoon, [Name] — Phoenix wraps up this week` (near deadline)
- `Hey [Name] — Aurora just hit a milestone` (recent update)
- `Good morning, [Name] — All green lights across the board` (no blockers)

**Motivational:**
- `Good morning, [Name] — Great work deserves great delivery`
- `Good afternoon, [Name] — Ship early, ship often`
- `Good evening, [Name] — Another day, another pixel perfect`

**Occasional playful:**
- `Hey [Name] — Build once, charge twice` (retainer reminder)
- `Good morning, [Name] — Scope creep stays outside today`
- `Good afternoon, [Name] — Your project game is tight`

---

### Tasks Page
*Purpose: Managing requests and to-dos*

**Default patterns:**
1. `Good morning, [Name] — Let's knock some tasks out`
2. `Good afternoon, [Name] — What's on the list today?`
3. `Good evening, [Name] — Time to close some loops`
4. `Hey [Name] — Progress over perfection`

**Activity-aware:**
- `Good morning, [Name] — 12 tasks, 3 urgent` (active workload)
- `Good afternoon, [Name] — You've crushed 8 tasks today` (progress!)
- `Hey [Name] — Only 2 tasks left for the week` (almost done)
- `Good morning, [Name] — Inbox zero feels amazing` (no tasks)

**Motivational:**
- `Good morning, [Name] — One task at a time wins the race`
- `Good afternoon, [Name] — Busy is good. Overwhelmed is fixable`
- `Good evening, [Name] — Tomorrow's going to be lighter`

**Occasional playful:**
- `Hey [Name] — Task management is self-care`
- `Good morning, [Name] — Small wins add up fast`
- `Good afternoon, [Name] — Future you will thank present you`

---

### Meetings Page
*Purpose: Client meeting coordination*

**Default patterns:**
1. `Good morning, [Name] — Who are we talking to today?`
2. `Good afternoon, [Name] — Your calendar is under control`
3. `Good evening, [Name] — All meetings wrapped`
4. `Hey [Name] — Great conversations create great projects`

**Activity-aware:**
- `Good morning, [Name] — Discovery call with Acme at 2pm` (upcoming today)
- `Good afternoon, [Name] — 3 meetings this week, all confirmed`
- `Hey [Name] — Check-in with Blue Co went great` (recent completion)
- `Good morning, [Name] — Light week. Time to focus` (few meetings)

**Contextual:**
- `Good morning, [Name] — Coffee before clients, always`
- `Good afternoon, [Name] — Strong meetings = strong projects`
- `Good evening, [Name] — You showed up, you crushed it`

**Occasional playful:**
- `Hey [Name] — Meetings don't have to be painful`
- `Good morning, [Name] — Listen more than you talk today`
- `Good afternoon, [Name] — Discovery calls are where the magic starts`

---

### Insights Page
*Purpose: Studio analytics and metrics*

**Default patterns:**
1. `Good morning, [Name] — Let's look at the numbers`
2. `Good afternoon, [Name] — Data tells the truth`
3. `Good evening, [Name] — The metrics are looking good`
4. `Hey [Name] — Numbers don't lie, but context matters`

**Activity-aware:**
- `Good morning, [Name] — Revenue up 15% this month` (positive trend)
- `Good afternoon, [Name] — You're averaging 3 new leads per week` (metric highlight)
- `Hey [Name] — Projects are closing faster than last quarter` (improvement)

**Reflective:**
- `Good morning, [Name] — What you measure, you improve`
- `Good afternoon, [Name] — Growth isn't always linear`
- `Good evening, [Name] — Celebrate the small wins too`

**Occasional playful:**
- `Hey [Name] — Spreadsheets, but make it strategic`
- `Good morning, [Name] — Data-driven decisions for the win`
- `Good afternoon, [Name] — Your studio is smarter than most`

---

### Studio Page
*Purpose: Team and studio settings*

**Default patterns:**
1. `Good morning, [Name] — Your studio, your rules`
2. `Good afternoon, [Name] — The engine is running smooth`
3. `Good evening, [Name] — All systems operational`
4. `Hey [Name] — This is your foundation`

**Team-aware (if applicable):**
- `Good morning, [Name] — Team of 3, shipping like 10`
- `Good afternoon, [Name] — Your team is doing great work`
- `Hey [Name] — Solo for now, scaling when ready`

**Reflective:**
- `Good morning, [Name] — You built this. Own it`
- `Good afternoon, [Name] — Strong foundations scale effortlessly`
- `Good evening, [Name] — Every studio starts somewhere`

**Occasional playful:**
- `Hey [Name] — Systems thinking is a superpower`
- `Good morning, [Name] — Infrastructure > hustle culture`
- `Good afternoon, [Name] — You've got the architecture right`

---

### Settings Page
*Purpose: Account configuration*

**Default patterns:**
1. `Good morning, [Name] — Let's get this dialed in`
2. `Good afternoon, [Name] — Making tweaks?`
3. `Good evening, [Name] — Everything where you want it?`
4. `Hey [Name] — Customization is control`

**Contextual:**
- `Good morning, [Name] — Small adjustments, big impact`
- `Good afternoon, [Name] — Your setup, your way`
- `Good evening, [Name] — Fine-tuning never ends`

**Occasional playful:**
- `Hey [Name] — Organization is a love language`
- `Good morning, [Name] — Preferences matter`
- `Good afternoon, [Name] — This is your cockpit, adjust accordingly`

---

### Support Page
*Purpose: Help resources and contact*

**Default patterns:**
1. `Good morning, [Name] — We're here if you need us`
2. `Good afternoon, [Name] — How can we help?`
3. `Good evening, [Name] — Support is standing by`
4. `Hey [Name] — Stuck? We've got your back`

**Reassuring:**
- `Good morning, [Name] — No question is too small`
- `Good afternoon, [Name] — We respond fast, we fix faster`
- `Good evening, [Name] — Let's solve this together`

**Occasional playful:**
- `Hey [Name] — Docs first, support second (but we're ready)`
- `Good morning, [Name] — You're not alone in this`
- `Good afternoon, [Name] — Great support makes great software`

---

### Inbox Page
*Purpose: Client messages and notifications*

**Default patterns:**
1. `Good morning, [Name] — Let's see what came in`
2. `Good afternoon, [Name] — Staying on top of messages`
3. `Good evening, [Name] — Almost caught up`
4. `Hey [Name] — Communication is half the job`

**Activity-aware:**
- `Good morning, [Name] — 3 new messages since yesterday`
- `Good afternoon, [Name] — You're all caught up` (inbox zero!)
- `Hey [Name] — Acme Corp replied to your update` (recent activity)

**Motivational:**
- `Good morning, [Name] — Respond fast, look professional`
- `Good afternoon, [Name] — Clear inbox = clear mind`
- `Good evening, [Name] — Tomorrow's a fresh start`

**Occasional playful:**
- `Hey [Name] — Inbox zero is the dream`
- `Good morning, [Name] — Your response time is impressive`
- `Good afternoon, [Name] — Clients love a quick reply`

---

## Technical Implementation Notes

### Data Requirements

To make these contextual, we need:
- **User first name**: `user.user_metadata.full_name.split(' ')[0]`
- **Current time**: `new Date().getHours()`
- **Page context**: Current route/page identifier
- **Optional activity data**:
  - Task count, completion count
  - Active project count
  - Recent client messages
  - Upcoming meetings
  - Studio metrics (if available)

### Component Structure

```typescript
interface GreetingProps {
  userName: string;
  pageContext: 'overview' | 'clients' | 'projects' | 'tasks' | 'meetings' | 'insights' | 'studio' | 'settings' | 'support' | 'inbox';
  activityData?: {
    taskCount?: number;
    completedToday?: number;
    activeProjects?: number;
    unreadMessages?: number;
    upcomingMeetings?: Meeting[];
    // ... other contextual data
  };
}
```

### Greeting Selection Logic

1. **Determine time-based greeting** (morning/afternoon/evening/late-night)
2. **Check for activity-aware data** (if available, use contextual greeting)
3. **Fall back to default pattern** (always have a safe fallback)
4. **Rotate within category** (avoid showing same greeting twice in a row)

### Storage

Use `localStorage` to track:
- Last greeting shown (avoid immediate repetition)
- Greeting rotation index (cycle through options)

```typescript
const STORAGE_KEY = 'salt-last-greeting';

function getGreeting(props: GreetingProps): string {
  const lastGreeting = localStorage.getItem(STORAGE_KEY);
  const greetings = getGreetingsForContext(props);
  
  // Filter out last greeting if possible
  const availableGreetings = greetings.length > 1 
    ? greetings.filter(g => g !== lastGreeting)
    : greetings;
  
  // Randomly select from available
  const selected = availableGreetings[Math.floor(Math.random() * availableGreetings.length)];
  
  localStorage.setItem(STORAGE_KEY, selected);
  return selected;
}
```

---

## Usage Guidelines

### Do's
✓ Keep greetings concise (under 60 characters total)
✓ Use first names only (never last names)
✓ Rotate greetings to avoid staleness
✓ Celebrate user progress when data is available
✓ Stay warm but professional
✓ Make it feel personal, not automated

### Don'ts
✗ Don't be overly familiar or intrusive
✗ Don't reference sensitive data in greetings
✗ Don't use corporate jargon or marketing speak
✗ Don't overwhelm with too much context
✗ Don't use emojis (keep text clean)
✗ Don't make assumptions about user mood or situation

---

## Future Enhancements

### Phase 2: Advanced Contextual Awareness
- **Streak tracking**: "7 days in a row—you're on fire"
- **Milestone celebrations**: "Congrats on launching your 10th project"
- **Seasonal references**: "Happy Friday, [Name] — weekend mode engaged"
- **Weather integration**: "Rainy day? Perfect for focused work"

### Phase 3: AI-Generated Personalization
- Generate unique greetings based on user activity patterns
- Learn user preferences (funny vs. serious)
- Adapt to studio growth stage
- Personalize based on time-of-day work patterns

### Phase 4: Team Awareness
- Reference team activity: "Your team shipped 15 tasks this week"
- Celebrate collaborative wins
- Acknowledge individual contributions within team context

---

**Last Updated**: January 2, 2026  
**Owner**: Gabriella Martins  
**Status**: Awaiting implementation  
**Next Steps**: Review suggestions, select favorites, build greeting component

