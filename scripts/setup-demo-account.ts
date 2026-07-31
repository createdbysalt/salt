/**
 * Demo Account Setup Script
 *
 * Creates a demo@usesalt.io account and seeds it with comprehensive demo data
 * for all surfaces: HQ, People, Work, Billing, Plays, Connections, Me.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- npx tsx scripts/setup-demo-account.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@usesalt.io";
const DEMO_PASSWORD = "SaltDemo2026!";
const DEMO_WORKSPACE_NAME = "Demo Workspace";
const DEMO_WORKSPACE_SLUG = "demo-usesalt-io";

// ============================================================================
// DEMO DATA DEFINITIONS
// ============================================================================

interface DemoOrg {
  name: string;
  slug: string;
  website: string;
  industry: string;
  notes: string;
  relationshipStatus: "client" | "lead" | "partner" | "past_client";
  contacts: DemoPerson[];
  work: DemoWork[];
}

interface DemoPerson {
  name: string;
  email: string;
  title: string;
  isPrimary: boolean;
  lastContactDaysAgo: number;
  phone?: string;
}

interface DemoWork {
  name: string;
  description: string;
  status: "draft" | "signed" | "active" | "on_hold" | "completed";
  value: number;
  startDate: string;
  endDate?: string;
}

// Comprehensive client roster (10 orgs, 20+ people, 15+ work items)
const DEMO_ORGS: DemoOrg[] = [
  {
    name: "Evergreen Brands",
    slug: "evergreen-brands",
    website: "https://evergreenbrands.co",
    industry: "Consumer Goods",
    notes: "Premium DTC brand portfolio. Q4 contract renewal coming up.",
    relationshipStatus: "client",
    contacts: [
      { name: "Sarah Chen", email: "sarah@evergreenbrands.co", title: "VP Marketing", isPrimary: true, lastContactDaysAgo: 2, phone: "+1 415-555-0101" },
      { name: "Marcus Williams", email: "marcus@evergreenbrands.co", title: "Brand Director", isPrimary: false, lastContactDaysAgo: 8 },
    ],
    work: [
      { name: "Brand Refresh Q3", description: "Full visual identity refresh across all channels", status: "active", value: 24000, startDate: "2026-07-01", endDate: "2026-09-30" },
      { name: "Holiday Campaign 2026", description: "Q4 holiday campaign creative and media buy", status: "draft", value: 45000, startDate: "2026-10-01", endDate: "2026-12-31" },
    ],
  },
  {
    name: "Meridian Tech",
    slug: "meridian-tech",
    website: "https://meridiantech.io",
    industry: "B2B SaaS",
    notes: "Series B startup, aggressive growth mode. Want to 3x content output.",
    relationshipStatus: "client",
    contacts: [
      { name: "James Park", email: "james@meridiantech.io", title: "Head of Growth", isPrimary: true, lastContactDaysAgo: 1, phone: "+1 650-555-0202" },
      { name: "Elena Rodriguez", email: "elena@meridiantech.io", title: "Content Lead", isPrimary: false, lastContactDaysAgo: 5 },
    ],
    work: [
      { name: "Content Engine Build", description: "Establish scalable content production system", status: "active", value: 15000, startDate: "2026-06-15" },
      { name: "Product Launch Support", description: "Go-to-market content for new feature release", status: "active", value: 8500, startDate: "2026-07-20", endDate: "2026-08-15" },
    ],
  },
  {
    name: "Luna Wellness",
    slug: "luna-wellness",
    website: "https://lunawellness.com",
    industry: "Health & Wellness",
    notes: "Boutique wellness brand expanding nationally. Strong founder story.",
    relationshipStatus: "client",
    contacts: [
      { name: "Amanda Foster", email: "amanda@lunawellness.com", title: "Founder & CEO", isPrimary: true, lastContactDaysAgo: 4, phone: "+1 310-555-0303" },
    ],
    work: [
      { name: "Brand Strategy", description: "National expansion positioning and messaging", status: "completed", value: 12000, startDate: "2026-05-01", endDate: "2026-06-30" },
      { name: "Monthly Retainer", description: "Ongoing social media and content management", status: "active", value: 6500, startDate: "2026-07-01" },
    ],
  },
  {
    name: "Catalyst Ventures",
    slug: "catalyst-ventures",
    website: "https://catalystvc.com",
    industry: "Venture Capital",
    notes: "Interested in becoming a client. Met at conference last month. Big potential.",
    relationshipStatus: "lead",
    contacts: [
      { name: "David Liu", email: "david@catalystvc.com", title: "Partner", isPrimary: true, lastContactDaysAgo: 12 },
      { name: "Rachel Kim", email: "rachel@catalystvc.com", title: "Principal", isPrimary: false, lastContactDaysAgo: 15 },
    ],
    work: [
      { name: "Portfolio Brand Services", description: "White-label branding for portfolio companies", status: "draft", value: 50000, startDate: "2026-08-01" },
    ],
  },
  {
    name: "Artisan Coffee Co",
    slug: "artisan-coffee",
    website: "https://artisancoffee.co",
    industry: "Food & Beverage",
    notes: "Regional specialty coffee brand. Great photography opportunities.",
    relationshipStatus: "client",
    contacts: [
      { name: "Nina Patel", email: "nina@artisancoffee.co", title: "Marketing Manager", isPrimary: true, lastContactDaysAgo: 6 },
      { name: "Tom Martinez", email: "tom@artisancoffee.co", title: "Founder", isPrimary: false, lastContactDaysAgo: 21 },
    ],
    work: [
      { name: "Summer Campaign", description: "Cold brew launch campaign across social", status: "active", value: 9500, startDate: "2026-06-15", endDate: "2026-08-31" },
    ],
  },
  {
    name: "Vertex Architecture",
    slug: "vertex-architecture",
    website: "https://vertexarch.com",
    industry: "Professional Services",
    notes: "Boutique architecture firm. Referred by Amanda Foster.",
    relationshipStatus: "client",
    contacts: [
      { name: "Michael Torres", email: "michael@vertexarch.com", title: "Principal Architect", isPrimary: true, lastContactDaysAgo: 3, phone: "+1 212-555-0404" },
    ],
    work: [
      { name: "Website Redesign", description: "Complete portfolio website overhaul", status: "active", value: 18000, startDate: "2026-07-01", endDate: "2026-09-15" },
    ],
  },
  {
    name: "Bloom Creative",
    slug: "bloom-creative",
    website: "https://bloomcreative.co",
    industry: "Creative Agency",
    notes: "Partner agency for overflow work. Excellent photo team.",
    relationshipStatus: "partner",
    contacts: [
      { name: "Jessica Wong", email: "jessica@bloomcreative.co", title: "Creative Director", isPrimary: true, lastContactDaysAgo: 7 },
    ],
    work: [
      { name: "Photo Support Retainer", description: "On-call photography for client projects", status: "active", value: 4000, startDate: "2026-01-01" },
    ],
  },
  {
    name: "Horizon Fitness",
    slug: "horizon-fitness",
    website: "https://horizonfitness.com",
    industry: "Fitness & Sports",
    notes: "Chain of boutique gyms. Expanding to 3 new locations.",
    relationshipStatus: "client",
    contacts: [
      { name: "Chris Anderson", email: "chris@horizonfitness.com", title: "Marketing Director", isPrimary: true, lastContactDaysAgo: 9 },
      { name: "Lisa Chen", email: "lisa@horizonfitness.com", title: "Brand Manager", isPrimary: false, lastContactDaysAgo: 11 },
    ],
    work: [
      { name: "Location Launch Kit", description: "Brand assets for 3 new gym locations", status: "active", value: 22000, startDate: "2026-07-15", endDate: "2026-10-01" },
    ],
  },
  {
    name: "Nexus Labs",
    slug: "nexus-labs",
    website: "https://nexuslabs.io",
    industry: "Biotech",
    notes: "Past client - good relationship. May have new project in fall.",
    relationshipStatus: "past_client",
    contacts: [
      { name: "Dr. Sarah Mitchell", email: "sarah.mitchell@nexuslabs.io", title: "Head of Marketing", isPrimary: true, lastContactDaysAgo: 45 },
    ],
    work: [
      { name: "Brand Launch 2025", description: "Initial brand identity and launch materials", status: "completed", value: 35000, startDate: "2025-09-01", endDate: "2025-12-15" },
    ],
  },
  {
    name: "Studio Collective",
    slug: "studio-collective",
    website: "https://studiocollective.design",
    industry: "Design Studio",
    notes: "New lead from LinkedIn. Interested in strategy services.",
    relationshipStatus: "lead",
    contacts: [
      { name: "Alex Rivera", email: "alex@studiocollective.design", title: "Founder", isPrimary: true, lastContactDaysAgo: 2 },
    ],
    work: [],
  },
];

// Plays in the queue (5 plays showing Salt's proactive value)
interface DemoPlay {
  title: string;
  preview: string;
  draftBody: string;
  recipientLabel: string;
  channel: "Gmail" | "Slack" | "Note";
  confidence: number;
  etaLabel: string;
  targetOrgSlug?: string;
  sourceUrl?: string;
  triggerLabel?: string;
}

const DEMO_PLAYS: DemoPlay[] = [
  {
    title: "$50K deal closing today — David needs the proposal",
    preview: "Catalyst meeting in 2 hours. Proposal attached, talking points ready.",
    draftBody: "Hi David,\n\nLooking forward to our call at 4pm! As discussed, I've attached the full Portfolio Brand Services proposal.\n\nQuick summary:\n• $50K/year for up to 5 portfolio companies\n• Dedicated brand strategist for each\n• 48-hour turnaround on urgent requests\n\nI've also included the Meridian Tech case study you asked about — they saw 3x content output in 90 days.\n\nSee you at 4!\n\nBest,\n[You]",
    recipientLabel: "David Liu",
    channel: "Gmail",
    confidence: 98,
    etaLabel: "Send before 4pm",
    targetOrgSlug: "catalyst-ventures",
    sourceUrl: "https://mail.google.com/mail/u/0/#inbox/1234567890abcdef",
    triggerLabel: "Email from David asking for proposal",
  },
  {
    title: "Sarah wants to expand — $45K holiday campaign",
    preview: "She replied 'love it, let's talk budget' yesterday. Strike now.",
    draftBody: "Hi Sarah,\n\nSo glad you loved the holiday campaign concepts! I'm excited about the TikTok angle especially.\n\nTo lock in our preferred vendors and holiday ad inventory, I'd recommend we finalize by end of week. Here's what I'm thinking:\n\n• Campaign budget: $45K (Oct-Dec)\n• Includes: 12 hero assets, TikTok series, influencer collab\n• Timeline: Creative kickoff Sept 15\n\nWant to hop on a quick call tomorrow to iron out details?\n\nBest,\n[You]",
    recipientLabel: "Sarah Chen",
    channel: "Gmail",
    confidence: 95,
    etaLabel: "Reply within 24h",
    targetOrgSlug: "evergreen-brands",
    sourceUrl: "https://mail.google.com/mail/u/0/#inbox/abcdef1234567890",
    triggerLabel: "Sarah replied 'love it, let's talk budget'",
  },
  {
    title: "Meridian launch in 15 days — video script needs approval",
    preview: "James is waiting on your sign-off. Blocking production.",
    draftBody: "Hi James,\n\nQuick flag — the product launch video script is ready for your final approval. Once you sign off, we can start production Monday and still hit the Aug 15 launch.\n\nI've attached:\n• Video script v3 (your edits incorporated)\n• Storyboard preview\n• Production timeline\n\nCan you review today? Happy to jump on a call if easier.\n\nBest,\n[You]",
    recipientLabel: "James Park",
    channel: "Gmail",
    confidence: 96,
    etaLabel: "Blocking launch",
    targetOrgSlug: "meridian-tech",
    sourceUrl: "https://calendar.google.com/calendar/event?eid=abc123",
    triggerLabel: "Aug 15 launch deadline approaching",
  },
  {
    title: "Amanda mentioned video twice — $60K/year opportunity",
    preview: "She said 'we really need video' in Tuesday's call. Perfect timing.",
    draftBody: "Hi Amanda,\n\nI kept thinking about what you said Tuesday — that Luna Wellness needs video to tell your founder story properly. You're absolutely right.\n\nI put together a quick proposal:\n\n• Monthly package: $5K/month ($60K/year)\n• Includes: 4 short-form + 1 long-form per month\n• First video: Your origin story for the national expansion\n\nGiven your growth trajectory, this could be the unlock. Want to discuss Thursday?\n\nBest,\n[You]",
    recipientLabel: "Amanda Foster",
    channel: "Gmail",
    confidence: 92,
    etaLabel: "Hot lead",
    targetOrgSlug: "luna-wellness",
    sourceUrl: "https://mail.google.com/mail/u/0/#inbox/video123456",
    triggerLabel: "Amanda mentioned 'we need video' twice",
  },
  {
    title: "New lead from Alex — wants strategy help ASAP",
    preview: "Founder of Studio Collective. 'Need help yesterday' energy.",
    draftBody: "Hi Alex,\n\nGreat to connect! I checked out Studio Collective — love what you're building. The portfolio is strong, and I can see exactly where strategic positioning could 10x your inbound.\n\nI have two slots this week:\n• Thursday 2pm\n• Friday 10am\n\nGrab whichever works and let's talk about where you want to take this.\n\nBest,\n[You]",
    recipientLabel: "Alex Rivera",
    channel: "Gmail",
    confidence: 94,
    etaLabel: "Respond today",
    targetOrgSlug: "studio-collective",
    sourceUrl: "https://www.linkedin.com/messaging/thread/alex-rivera-123",
    triggerLabel: "New LinkedIn inquiry from Alex",
  },
];

// Billing records for HQ revenue display
interface DemoBillingRecord {
  orgSlug: string;
  number: string;
  amountCents: number;
  status: "paid" | "due" | "overdue" | "draft";
  issuedDaysAgo: number;
  paidDaysAgo?: number;
  description: string;
}

const DEMO_BILLING_RECORDS: DemoBillingRecord[] = [
  // Paid this month (MTD revenue)
  { orgSlug: "evergreen-brands", number: "INV-2026-052", amountCents: 1200000, status: "paid", issuedDaysAgo: 12, paidDaysAgo: 4, description: "Brand Refresh Q3 - July" },
  { orgSlug: "meridian-tech", number: "INV-2026-051", amountCents: 750000, status: "paid", issuedDaysAgo: 10, paidDaysAgo: 3, description: "Content Engine - July" },
  { orgSlug: "luna-wellness", number: "INV-2026-050", amountCents: 650000, status: "paid", issuedDaysAgo: 8, paidDaysAgo: 2, description: "Monthly Retainer - July" },
  { orgSlug: "vertex-architecture", number: "INV-2026-049", amountCents: 900000, status: "paid", issuedDaysAgo: 15, paidDaysAgo: 6, description: "Website Redesign - Phase 1" },
  { orgSlug: "horizon-fitness", number: "INV-2026-047", amountCents: 1100000, status: "paid", issuedDaysAgo: 18, paidDaysAgo: 8, description: "Location Launch Kit - Deposit" },
  // Paid last month (for comparison)
  { orgSlug: "evergreen-brands", number: "INV-2026-042", amountCents: 1200000, status: "paid", issuedDaysAgo: 42, paidDaysAgo: 32, description: "Brand Refresh Q3 - June" },
  { orgSlug: "meridian-tech", number: "INV-2026-041", amountCents: 750000, status: "paid", issuedDaysAgo: 40, paidDaysAgo: 30, description: "Content Engine - June" },
  { orgSlug: "luna-wellness", number: "INV-2026-040", amountCents: 1200000, status: "paid", issuedDaysAgo: 38, paidDaysAgo: 28, description: "Brand Strategy - Final" },
  // Due (pipeline)
  { orgSlug: "artisan-coffee", number: "INV-2026-048", amountCents: 475000, status: "overdue", issuedDaysAgo: 35, description: "Summer Campaign - Phase 1" },
  { orgSlug: "meridian-tech", number: "INV-2026-053", amountCents: 425000, status: "due", issuedDaysAgo: 3, description: "Product Launch Support" },
  { orgSlug: "bloom-creative", number: "INV-2026-054", amountCents: 400000, status: "due", issuedDaysAgo: 5, description: "Photo Support - July" },
  // Draft
  { orgSlug: "evergreen-brands", number: "INV-2026-055", amountCents: 2250000, status: "draft", issuedDaysAgo: 0, description: "Holiday Campaign - Deposit" },
  { orgSlug: "catalyst-ventures", number: "INV-2026-056", amountCents: 2500000, status: "draft", issuedDaysAgo: 0, description: "Portfolio Services - Proposal" },
];

// Opportunity gaps for HQ briefing
interface DemoOpportunityGap {
  claim: string;
  summary: string;
  amountMin?: number;
  amountMax?: number;
  confidence: number;
  category: string;
  isPrimary: boolean;
}

const DEMO_OPPORTUNITY_GAPS: DemoOpportunityGap[] = [
  {
    claim: "$50K deal going cold — follow up today",
    summary: "Catalyst Ventures hasn't responded in 12 days. You have a meeting at 4pm — don't miss it.",
    amountMin: 50000,
    amountMax: 50000,
    confidence: 88,
    category: "risk",
    isPrimary: true,
  },
  {
    claim: "2 contracts expiring in 30 days",
    summary: "Evergreen ($24K) and Artisan ($9.5K) end Sept 30. Start renewal conversations now.",
    amountMin: 33500,
    amountMax: 33500,
    confidence: 95,
    category: "renewal",
    isPrimary: false,
  },
  {
    claim: "Upsell ready: Luna Wellness wants video",
    summary: "Amanda mentioned video twice in your last call. Potential $5K/month add-on.",
    amountMin: 60000,
    amountMax: 60000,
    confidence: 82,
    category: "expansion",
    isPrimary: false,
  },
];

// Meetings for calendar display - use relative dates so demo always has TODAY meetings
// Valid meeting_type values: 'discovery', 'check-in', 'review', 'kickoff', 'other'
interface DemoMeeting {
  title: string;
  daysFromNow: number; // 0 = today, 1 = tomorrow, etc.
  hour: number;
  durationMinutes: number;
  meetingType: "discovery" | "check-in" | "review" | "kickoff" | "other";
  notes?: string;
  orgSlug?: string;
  personName?: string;
}

const DEMO_MEETINGS: DemoMeeting[] = [
  // TODAY - these will show in "Today's schedule"
  { title: "Meridian Tech - Weekly Sync", daysFromNow: 0, hour: 14, durationMinutes: 30, meetingType: "check-in", notes: "Content pipeline review, launch prep. James mentioned Aug 15 deadline.", orgSlug: "meridian-tech", personName: "James Park" },
  { title: "Catalyst Ventures - Follow-up", daysFromNow: 0, hour: 16, durationMinutes: 45, meetingType: "review", notes: "Big opportunity - $50K portfolio services deal. Bring case studies.", orgSlug: "catalyst-ventures", personName: "David Liu" },
  // TOMORROW
  { title: "Evergreen - Q4 Campaign Kickoff", daysFromNow: 1, hour: 10, durationMinutes: 90, meetingType: "kickoff", notes: "Present $45K holiday campaign concepts", orgSlug: "evergreen-brands", personName: "Sarah Chen" },
  { title: "Studio Collective - Intro Call", daysFromNow: 1, hour: 15, durationMinutes: 30, meetingType: "discovery", notes: "New lead from LinkedIn - interested in strategy services", orgSlug: "studio-collective", personName: "Alex Rivera" },
  // THIS WEEK
  { title: "Vertex Architecture - Design Review", daysFromNow: 2, hour: 11, durationMinutes: 60, meetingType: "review", notes: "Review homepage wireframes, discuss photography", orgSlug: "vertex-architecture", personName: "Michael Torres" },
  { title: "Luna Wellness - Monthly Retro", daysFromNow: 3, hour: 14, durationMinutes: 60, meetingType: "review", notes: "Review July performance, pitch video add-on", orgSlug: "luna-wellness", personName: "Amanda Foster" },
  { title: "Horizon Fitness - Location Launch Check-in", daysFromNow: 4, hour: 10, durationMinutes: 45, meetingType: "check-in", notes: "Review brand assets for 3 new gym locations", orgSlug: "horizon-fitness", personName: "Chris Anderson" },
];

// Captures for activity stream
interface DemoCapture {
  sourceType: string;
  captureType: string;
  title: string;
  extractedData: Record<string, unknown>;
  state: "pending" | "routed" | "dismissed";
  confidence: number;
  daysAgo: number;
  orgSlug?: string;
  personName?: string;
}

const DEMO_CAPTURES: DemoCapture[] = [
  { sourceType: "gmail", captureType: "message", title: "Re: Holiday Campaign Proposal", extractedData: { from: "sarah@evergreenbrands.co", subject: "Re: Holiday Campaign Proposal", snippet: "This looks great! Let's discuss timeline..." }, state: "routed", confidence: 95, daysAgo: 0, orgSlug: "evergreen-brands", personName: "Sarah Chen" },
  { sourceType: "googlecalendar", captureType: "meeting", title: "Meridian Tech - Weekly Sync", extractedData: { attendees: ["james@meridiantech.io"], duration: 30 }, state: "routed", confidence: 100, daysAgo: 0, orgSlug: "meridian-tech", personName: "James Park" },
  { sourceType: "gmail", captureType: "message", title: "New lead from LinkedIn", extractedData: { from: "alex@studiocollective.design", subject: "Interested in your services", snippet: "Hi, I came across your work and..." }, state: "pending", confidence: 75, daysAgo: 2, orgSlug: "studio-collective", personName: "Alex Rivera" },
  { sourceType: "gmail", captureType: "message", title: "Invoice question from Artisan", extractedData: { from: "nina@artisancoffee.co", subject: "Quick question on invoice", snippet: "Can we discuss the payment terms..." }, state: "pending", confidence: 80, daysAgo: 1, orgSlug: "artisan-coffee", personName: "Nina Patel" },
  { sourceType: "gmail", captureType: "message", title: "Catalyst follow-up needed", extractedData: { from: "david@catalystvc.com", subject: "Re: Portfolio Services", snippet: "Let me check with the partners..." }, state: "routed", confidence: 88, daysAgo: 12, orgSlug: "catalyst-ventures", personName: "David Liu" },
  { sourceType: "googlecalendar", captureType: "meeting", title: "Luna Wellness - Monthly Review", extractedData: { attendees: ["amanda@lunawellness.com"], duration: 60 }, state: "routed", confidence: 100, daysAgo: 4, orgSlug: "luna-wellness", personName: "Amanda Foster" },
];

// Intelligence findings for HQ
interface DemoFinding {
  findingType: "revenue_closing" | "revenue_risk" | "revenue_upsell" | "pending_deliverable" | "pending_reply";
  title: string;
  content: string;
  confidence: number;
  orgSlug?: string;
}

const DEMO_FINDINGS: DemoFinding[] = [
  { findingType: "revenue_closing", title: "Evergreen Q4 campaign ready to sign", content: "Sarah approved the $45K holiday campaign proposal. Just needs contract sent.", confidence: 95, orgSlug: "evergreen-brands" },
  { findingType: "revenue_risk", title: "Catalyst deal going cold", content: "No response from David Liu in 12 days. $50K deal may slip to next quarter.", confidence: 78, orgSlug: "catalyst-ventures" },
  { findingType: "revenue_upsell", title: "Luna Wellness interested in video", content: "Amanda mentioned video twice in last call. Potential $5K/month add-on.", confidence: 82, orgSlug: "luna-wellness" },
  { findingType: "pending_deliverable", title: "Meridian launch content due Aug 15", content: "Product launch assets deadline in 2 weeks. Video brief still pending.", confidence: 90, orgSlug: "meridian-tech" },
  { findingType: "pending_reply", title: "Artisan Coffee invoice inquiry", content: "Nina asked about payment terms yesterday. Hasn't received response.", confidence: 85, orgSlug: "artisan-coffee" },
];

// User profile data for Me section
const DEMO_USER_PROFILE = {
  firstName: "Demo",
  lastName: "User",
  company: "Salt Demo Studio",
  title: "Founder & Creative Director",
  bio: "Building brands that matter. Focused on helping ambitious companies tell their story.",
  location: "San Francisco, CA",
  timezone: "America/Los_Angeles",
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function createOrFindDemoUser(): Promise<string> {
  console.log(`\nLooking for user: ${DEMO_EMAIL}...`);

  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError || !users) {
    throw new Error(`Failed to list users: ${listError?.message || "No data"}`);
  }

  const existingUser = users.users.find((u: { email?: string }) => u.email === DEMO_EMAIL);
  if (existingUser) {
    console.log(`  ✓ Found existing user: ${existingUser.id}`);
    return existingUser.id;
  }

  console.log(`  Creating new user...`);
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: `${DEMO_USER_PROFILE.firstName} ${DEMO_USER_PROFILE.lastName}`,
      first_name: DEMO_USER_PROFILE.firstName,
      last_name: DEMO_USER_PROFILE.lastName,
    },
  });

  if (createError || !newUser) {
    throw new Error(`Failed to create user: ${createError?.message || "No data"}`);
  }

  console.log(`  ✓ Created user: ${newUser.user.id}`);
  return newUser.user.id;
}

async function findOrCreateWorkspace(userId: string): Promise<string> {
  console.log(`\nSetting up workspace...`);

  const { data: existing } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("slug", DEMO_WORKSPACE_SLUG)
    .single();

  if (existing) {
    if (existing.owner_id !== userId) {
      throw new Error(`Workspace "${DEMO_WORKSPACE_SLUG}" owned by another user. Safety check failed.`);
    }
    console.log(`  ✓ Found existing workspace: ${existing.name}`);

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", existing.id)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      await supabase.from("workspace_members").insert({
        workspace_id: existing.id,
        user_id: userId,
        role: "owner",
        email: DEMO_EMAIL,
      });
    }

    return existing.id;
  }

  const { data: newWorkspace, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userId,
      name: DEMO_WORKSPACE_NAME,
      slug: DEMO_WORKSPACE_SLUG,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create workspace: ${error.message}`);

  console.log(`  ✓ Created workspace: ${DEMO_WORKSPACE_NAME}`);

  await supabase.from("workspace_members").insert({
    workspace_id: newWorkspace.id,
    user_id: userId,
    role: "owner",
    email: DEMO_EMAIL,
  });

  return newWorkspace.id;
}

async function clearDemoData(workspaceId: string) {
  console.log(`\nClearing existing demo data...`);

  // Order matters - delete in reverse dependency order
  await supabase.from("capture_routing_decisions").delete().eq("workspace_id", workspaceId);
  await supabase.from("capture_events").delete().eq("workspace_id", workspaceId);
  await supabase.from("intelligence_findings").delete().eq("workspace_id", workspaceId);
  await supabase.from("billing_records").delete().eq("workspace_id", workspaceId);
  await supabase.from("play_runs").delete().eq("workspace_id", workspaceId);
  await supabase.from("opportunity_gaps").delete().eq("workspace_id", workspaceId);
  await supabase.from("meetings").delete().eq("workspace_id", workspaceId);
  await supabase.from("work").delete().eq("workspace_id", workspaceId);
  await supabase.from("files").delete().eq("workspace_id", workspaceId);
  await supabase.from("entity_links").delete().eq("workspace_id", workspaceId);
  await supabase.from("people").delete().eq("workspace_id", workspaceId);
  await supabase.from("organizations").delete().eq("workspace_id", workspaceId);

  console.log(`  ✓ Cleared`);
}

async function seedOrganizations(workspaceId: string): Promise<Map<string, string>> {
  console.log(`\nSeeding organizations (${DEMO_ORGS.length})...`);
  const orgIds = new Map<string, string>();

  for (const org of DEMO_ORGS) {
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        workspace_id: workspaceId,
        name: org.name,
        slug: org.slug,
        website: org.website,
        industry: org.industry,
        notes: org.notes,
        relationship_status: org.relationshipStatus,
        record_status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ ${org.name}: ${error.message}`);
      continue;
    }

    orgIds.set(org.slug, data.id);
    console.log(`  ✓ ${org.name}`);
  }

  return orgIds;
}

async function seedPeople(workspaceId: string, orgIds: Map<string, string>): Promise<Map<string, string>> {
  console.log(`\nSeeding people...`);
  const personIds = new Map<string, string>();

  for (const org of DEMO_ORGS) {
    const orgId = orgIds.get(org.slug);
    if (!orgId) continue;

    for (const contact of org.contacts) {
      const lastContactDate = new Date();
      lastContactDate.setDate(lastContactDate.getDate() - contact.lastContactDaysAgo);

      const { data, error } = await supabase
        .from("people")
        .insert({
          workspace_id: workspaceId,
          name: contact.name,
          email: contact.email,
          title: contact.title,
          phone: contact.phone || null,
          relationship_type: org.relationshipStatus === "lead" ? "prospect" : "client",
          record_status: "active",
          last_contact_at: lastContactDate.toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`  ✗ ${contact.name}: ${error.message}`);
        continue;
      }

      personIds.set(contact.email, data.id);
      personIds.set(contact.name, data.id); // Also index by name for lookups

      await supabase.from("entity_links").insert({
        workspace_id: workspaceId,
        source_type: "person",
        source_id: data.id,
        target_type: "org",
        target_id: orgId,
        relation_type: "employment",
        source: "demo-seed",
        confidence: 100,
      });

      console.log(`  ✓ ${contact.name} (${org.name})`);
    }
  }

  return personIds;
}

async function seedWork(workspaceId: string, orgIds: Map<string, string>, personIds: Map<string, string>) {
  console.log(`\nSeeding work...`);

  for (const org of DEMO_ORGS) {
    const orgId = orgIds.get(org.slug);
    if (!orgId) continue;

    const primaryContact = org.contacts.find((c) => c.isPrimary);
    const personId = primaryContact ? personIds.get(primaryContact.email) : undefined;

    for (const work of org.work) {
      // Generate slug from name
      const slug = `${org.slug}-${work.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

      const { error } = await supabase.from("work").insert({
        workspace_id: workspaceId,
        name: work.name,
        slug: slug,
        description: work.description,
        status: work.status,
        contract_value_cents: work.value * 100,
        start_date: work.startDate,
        deadline: work.endDate || null,
        organization_id: orgId,
        person_id: personId || null,
      });

      if (error) {
        console.error(`  ✗ ${work.name}: ${error.message}`);
        continue;
      }

      console.log(`  ✓ ${work.name} ($${work.value.toLocaleString()})`);
    }
  }
}

async function seedMeetings(workspaceId: string, orgIds: Map<string, string>, personIds: Map<string, string>) {
  console.log(`\nSeeding meetings (${DEMO_MEETINGS.length})...`);

  for (const meeting of DEMO_MEETINGS) {
    const orgId = meeting.orgSlug ? orgIds.get(meeting.orgSlug) : null;
    const personId = meeting.personName ? personIds.get(meeting.personName) : null;

    // Calculate actual date/time from relative days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + meeting.daysFromNow);
    startDate.setHours(meeting.hour, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + meeting.durationMinutes);

    const dayLabel = meeting.daysFromNow === 0 ? "Today" : meeting.daysFromNow === 1 ? "Tomorrow" : `+${meeting.daysFromNow}d`;

    const { error } = await supabase.from("meetings").insert({
      workspace_id: workspaceId,
      title: meeting.title,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      meeting_type: meeting.meetingType,
      notes: meeting.notes || null,
      organization_id: orgId,
      person_id: personId,
    });

    if (error) {
      console.error(`  ✗ ${meeting.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${meeting.title} (${dayLabel} ${meeting.hour}:00)`);
  }
}

async function seedPlays(workspaceId: string, orgIds: Map<string, string>) {
  console.log(`\nSeeding plays (${DEMO_PLAYS.length} queued + executed)...`);

  // First, add queued plays
  for (const play of DEMO_PLAYS) {
    const targetOrgId = play.targetOrgSlug ? orgIds.get(play.targetOrgSlug) : undefined;
    const targetOrg = DEMO_ORGS.find((o) => o.slug === play.targetOrgSlug);

    const { error } = await supabase.from("play_runs").insert({
      workspace_id: workspaceId,
      state: "queued",
      title: play.title,
      preview: play.preview,
      draft_body: play.draftBody,
      recipient_label: play.recipientLabel,
      channel: play.channel,
      confidence: play.confidence,
      eta_label: play.etaLabel,
      target_type: targetOrgId ? "organization" : null,
      target_id: targetOrgId,
      target_label: targetOrg?.name,
      metadata: {
        source_url: play.sourceUrl,
        trigger_label: play.triggerLabel,
      },
    });

    if (error) {
      console.error(`  ✗ ${play.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${play.title} (queued)`);
  }

  // Add executed plays (for time saved display) - MORE auto-handled than need-you items
  // Put more plays on TODAY (daysAgo: 0) for impressive briefing stats
  // Mix channels: Gmail, Slack, Note for variety
  const executedPlays = [
    // TODAY - impressive overnight/early morning auto-actions (12 for wow factor)
    { title: "Meeting brief prepped: Catalyst Ventures 4pm", daysAgo: 0, stakes: "high", channel: "Note", preview: "Assembled case studies, talking points, and $50K deal history for David Liu" },
    { title: "Meeting brief prepped: Meridian Tech 2pm", daysAgo: 0, stakes: "high", channel: "Note", preview: "Launch timeline, content status, deliverables checklist for James" },
    { title: "Invoice sent: Luna Wellness August retainer", daysAgo: 0, stakes: "high", channel: "Gmail", preview: "Auto-generated and sent INV-2026-057 for $6,500" },
    { title: "Follow-up sent: Evergreen Q3 check-in", daysAgo: 0, stakes: "high", channel: "Gmail", preview: "Brand refresh progress update, seeded holiday campaign discussion" },
    { title: "Invoice reminder: Artisan Coffee overdue", daysAgo: 0, stakes: "high", channel: "Gmail", preview: "Payment reminder for INV-2026-048 ($4,750) - 5 days overdue" },
    { title: "Proposal sent: Catalyst portfolio services", daysAgo: 0, stakes: "high", channel: "Gmail", preview: "Attached $50K proposal ahead of today's meeting" },
    { title: "Weekly digest: Meridian content pipeline", daysAgo: 0, stakes: "medium", channel: "Slack", preview: "Shared content status in #meridian-salt channel - 3/5 complete" },
    { title: "Calendar hold: Studio Collective intro", daysAgo: 0, stakes: "medium", channel: "Note", preview: "Blocked 30min tomorrow for new lead call with Alex Rivera" },
    { title: "Status update: Vertex Architecture", daysAgo: 0, stakes: "medium", channel: "Gmail", preview: "Shared website redesign Phase 1 progress - on track" },
    { title: "Contract renewal alert: Horizon Fitness", daysAgo: 0, stakes: "high", channel: "Gmail", preview: "30-day notice sent for $22K Location Launch Kit renewal" },
    { title: "Meeting notes shared: Luna Wellness", daysAgo: 0, stakes: "medium", channel: "Slack", preview: "Posted last call notes + video upsell talking points" },
    { title: "Lead response: Studio Collective", daysAgo: 0, stakes: "medium", channel: "Gmail", preview: "Warm response to Alex's LinkedIn inquiry with availability" },
    { title: "Thank you sent: Evergreen Brands", daysAgo: 0, stakes: "medium", channel: "Gmail", preview: "Appreciation note to Sarah for Q3 brand refresh partnership" },
    { title: "Project brief created: Horizon Fitness", daysAgo: 0, stakes: "high", channel: "Note", preview: "Location launch kit scope, timeline, and deliverables documented" },
    // YESTERDAY - more high-value plays
    { title: "Invoice sent: Evergreen monthly", daysAgo: 1, stakes: "high", channel: "Gmail", preview: "Auto-generated INV-2026-058 for $12,000 brand refresh" },
    { title: "Meeting prep: Evergreen Q4 kickoff", daysAgo: 1, stakes: "high", channel: "Note", preview: "Campaign concepts, budget breakdown, timeline for $45K project" },
    { title: "Follow-up sent: Bloom Creative", daysAgo: 1, stakes: "medium", channel: "Gmail", preview: "Photo support retainer check-in for July deliverables" },
    { title: "Calendar hold: Evergreen campaign kickoff", daysAgo: 1, stakes: "low", channel: "Note", preview: "Blocked 90min tomorrow based on email thread" },
    // THIS WEEK
    { title: "Proposal follow-up: Vertex Phase 2", daysAgo: 2, stakes: "high", channel: "Gmail", preview: "Gentle nudge on $9K Phase 2 website expansion" },
    { title: "Invoice sent: Horizon deposit", daysAgo: 3, stakes: "high", channel: "Gmail", preview: "Auto-generated INV-2026-056 for $11,000 location kit deposit" },
    { title: "Thank you sent: Artisan Coffee", daysAgo: 4, stakes: "medium", channel: "Gmail", preview: "Post-campaign appreciation to Nina for summer collab" },
    { title: "Intro scheduled: Studio Collective", daysAgo: 5, stakes: "medium", channel: "Gmail", preview: "Auto-replied to Alex's inquiry with Calendly link" },
  ];

  for (const play of executedPlays) {
    const ranAt = new Date();
    ranAt.setDate(ranAt.getDate() - play.daysAgo);

    const { error } = await supabase.from("play_runs").insert({
      workspace_id: workspaceId,
      state: "ran",
      title: play.title,
      preview: play.preview,
      stakes: play.stakes,
      ran_at: ranAt.toISOString(),
      channel: play.channel ?? "Gmail",
      confidence: 95,
    });

    if (error) {
      console.error(`  ✗ ${play.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${play.title} (ran)`);
  }
}

async function seedBilling(workspaceId: string, orgIds: Map<string, string>) {
  console.log(`\nSeeding billing (${DEMO_BILLING_RECORDS.length} records)...`);

  for (const record of DEMO_BILLING_RECORDS) {
    const orgId = orgIds.get(record.orgSlug);
    if (!orgId) continue;

    const issuedDate = new Date();
    issuedDate.setDate(issuedDate.getDate() - record.issuedDaysAgo);

    let paidDate = null;
    if (record.paidDaysAgo !== undefined) {
      paidDate = new Date();
      paidDate.setDate(paidDate.getDate() - record.paidDaysAgo);
    }

    const dueDate = new Date(issuedDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const { error } = await supabase.from("billing_records").insert({
      workspace_id: workspaceId,
      organization_id: orgId,
      direction: "receivable",
      number: record.number,
      source_external_id: `demo-${record.number}`, // Unique ID for upsert
      status: record.status,
      amount_cents: record.amountCents,
      amount_paid_cents: record.status === "paid" ? record.amountCents : 0,
      currency: "USD",
      issued_at: issuedDate.toISOString(),
      due_at: dueDate.toISOString(),
      paid_at: paidDate?.toISOString() ?? null,
    });

    if (error) {
      console.error(`  ✗ ${record.number}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${record.number} ($${(record.amountCents / 100).toLocaleString()})`);
  }
}

async function seedOpportunityGaps(workspaceId: string) {
  console.log(`\nSeeding opportunity gaps (${DEMO_OPPORTUNITY_GAPS.length})...`);

  for (const gap of DEMO_OPPORTUNITY_GAPS) {
    const { error } = await supabase.from("opportunity_gaps").insert({
      workspace_id: workspaceId,
      claim: gap.claim,
      summary: gap.summary,
      amount_min: gap.amountMin,
      amount_max: gap.amountMax,
      currency: "USD",
      confidence: gap.confidence,
      category: gap.category,
      is_primary: gap.isPrimary,
    });

    if (error) {
      console.error(`  ✗ ${gap.claim}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${gap.claim}`);
  }
}

async function seedCaptures(workspaceId: string, orgIds: Map<string, string>, personIds: Map<string, string>) {
  console.log(`\nSeeding captures (${DEMO_CAPTURES.length})...`);

  for (let i = 0; i < DEMO_CAPTURES.length; i++) {
    const capture = DEMO_CAPTURES[i];
    const captureDate = new Date();
    captureDate.setDate(captureDate.getDate() - capture.daysAgo);

    const { error } = await supabase.from("capture_events").insert({
      workspace_id: workspaceId,
      source_type: capture.sourceType,
      source_external_id: `demo-capture-${i}-${Date.now()}`, // Unique ID
      capture_type: capture.captureType,
      title: capture.title,
      extracted_data: capture.extractedData,
      raw_payload: capture.extractedData,
      state: capture.state,
      overall_confidence: capture.confidence,
      origin: "found",
      created_at: captureDate.toISOString(),
    });

    if (error) {
      console.error(`  ✗ ${capture.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${capture.title}`);
  }
}

async function seedFindings(workspaceId: string, orgIds: Map<string, string>) {
  console.log(`\nSeeding intelligence findings (${DEMO_FINDINGS.length})...`);

  for (const finding of DEMO_FINDINGS) {
    const orgId = finding.orgSlug ? orgIds.get(finding.orgSlug) : null;

    const { error } = await supabase.from("intelligence_findings").insert({
      workspace_id: workspaceId,
      finding_type: finding.findingType,
      title: finding.title,
      content: finding.content,
      confidence: finding.confidence,
      org_id: orgId,
      state: "needs_you",
    });

    if (error) {
      console.error(`  ✗ ${finding.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${finding.title}`);
  }
}

async function seedConnections(workspaceId: string) {
  console.log(`\nSeeding connections...`);

  const connections = [
    { provider: "gmail", label: "Gmail" },
    { provider: "googlecalendar", label: "Google Calendar" },
  ];

  for (const conn of connections) {
    const { error } = await supabase.from("workspace_integrations").insert({
      workspace_id: workspaceId,
      provider: conn.provider,
      is_active: true,
      capture_enabled: true,
      trust_level: "act_with_approval",
      connected_at: new Date().toISOString(),
    });

    if (error) {
      // Likely already exists - that's fine
      if (!error.message.includes("duplicate")) {
        console.error(`  ✗ ${conn.label}: ${error.message}`);
      }
      continue;
    }

    console.log(`  ✓ ${conn.label}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          SALT DEMO ACCOUNT SETUP (COMPREHENSIVE)          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  try {
    const userId = await createOrFindDemoUser();
    const workspaceId = await findOrCreateWorkspace(userId);

    await clearDemoData(workspaceId);

    const orgIds = await seedOrganizations(workspaceId);
    const personIds = await seedPeople(workspaceId, orgIds);
    await seedWork(workspaceId, orgIds, personIds);
    await seedMeetings(workspaceId, orgIds, personIds);
    await seedPlays(workspaceId, orgIds);
    await seedBilling(workspaceId, orgIds);
    await seedOpportunityGaps(workspaceId);
    await seedCaptures(workspaceId, orgIds, personIds);
    await seedFindings(workspaceId, orgIds);
    await seedConnections(workspaceId);

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║              DEMO ACCOUNT READY!                          ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Email:    ${DEMO_EMAIL.padEnd(45)}║`);
    console.log(`║  Password: ${DEMO_PASSWORD.padEnd(45)}║`);
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log("║  Seeded Data:                                             ║");
    console.log(`║  • ${DEMO_ORGS.length} organizations (clients, leads, partners)`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_ORGS.reduce((acc, o) => acc + o.contacts.length, 0)} people with contact history`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_ORGS.reduce((acc, o) => acc + o.work.length, 0)} work items (~$${Math.round(DEMO_ORGS.reduce((acc, o) => acc + o.work.reduce((a, w) => a + w.value, 0), 0) / 1000)}K pipeline)`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_BILLING_RECORDS.length} billing records`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_PLAYS.length} plays in queue`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_CAPTURES.length} activity captures`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_MEETINGS.length} upcoming meetings`.padEnd(60) + "║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log("║  Demo Flow:                                               ║");
    console.log("║  1. /onboarding → walkthrough                             ║");
    console.log("║  2. /hq → revenue, plays, briefing                        ║");
    console.log("║  3. /people → memory surface                              ║");
    console.log("║  4. /work → projects and pipeline                         ║");
    console.log("║  5. /plays → approval outbox                              ║");
    console.log("╚══════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
