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
  /** Drives the HQ client-pulse stat card. */
  healthBand: "healthy" | "watch" | "risk";
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
    healthBand: "healthy",
    contacts: [
      { name: "Sarah Chen", email: "sarah@evergreenbrands.co", title: "VP Marketing", isPrimary: true, lastContactDaysAgo: 2, phone: "+1 415-555-0101" },
      { name: "Marcus Williams", email: "marcus@evergreenbrands.co", title: "Brand Director", isPrimary: false, lastContactDaysAgo: 8 },
      { name: "Priya Nair", email: "priya@evergreenbrands.co", title: "Social Media Manager", isPrimary: false, lastContactDaysAgo: 3 },
      { name: "Tom Bradley", email: "tom@evergreenbrands.co", title: "Creative Director", isPrimary: false, lastContactDaysAgo: 6 },
      { name: "Lisa Chang", email: "lisa@evergreenbrands.co", title: "E-commerce Lead", isPrimary: false, lastContactDaysAgo: 11 },
      { name: "Jordan Reyes", email: "jordan@evergreenbrands.co", title: "PR & Communications", isPrimary: false, lastContactDaysAgo: 15 },
    ],
    work: [
      { name: "Brand Refresh Q3", description: "Full visual identity refresh across all channels", status: "active", value: 24000, startDate: "2026-07-01", endDate: "2026-09-30" },
      { name: "Holiday Campaign 2026", description: "Q4 holiday campaign creative and media buy", status: "draft", value: 45000, startDate: "2026-10-01", endDate: "2026-12-31" },
      { name: "Influencer Program", description: "Ongoing creator partnerships and gifting program", status: "active", value: 9000, startDate: "2026-06-01" },
      { name: "Retail Launch Kit", description: "In-store display assets for national retail debut", status: "active", value: 14000, startDate: "2026-07-15", endDate: "2026-10-01" },
      { name: "Spring Lookbook", description: "Seasonal photography and lookbook design", status: "completed", value: 8000, startDate: "2026-02-01", endDate: "2026-03-15" },
    ],
  },
  {
    name: "Meridian Tech",
    slug: "meridian-tech",
    website: "https://meridiantech.io",
    industry: "B2B SaaS",
    notes: "Series B startup, aggressive growth mode. Want to 3x content output.",
    relationshipStatus: "client",
    healthBand: "healthy",
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
    healthBand: "healthy",
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
    healthBand: "healthy",
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
    healthBand: "watch",
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
    healthBand: "healthy",
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
    healthBand: "healthy",
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
    healthBand: "watch",
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
    healthBand: "risk",
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
    healthBand: "healthy",
    contacts: [
      { name: "Alex Rivera", email: "alex@studiocollective.design", title: "Founder", isPrimary: true, lastContactDaysAgo: 2 },
    ],
    work: [],
  },
];

// Plays in the queue (5 plays showing Salt's proactive value)
//
// Richness is data-driven: the detail modal renders the full layout (section
// identity, step dots, "Prepared for you" artifacts/draft, "How Salt knew"
// evidence) only when the row carries v2 attribution — source_context.
// playbook_slug plus metadata { section, layer, output_type, playbook_name,
// headline, evidence, artifacts }. Seeded rows must include all of it or the
// modal falls back to a bare title + preview.
interface DemoPlayEvidence {
  label: string;
  url?: string;
  appLabel?: string;
  appId?: string;
}

interface DemoPlayArtifact {
  appId: string;
  label: string;
  url?: string;
}

interface DemoPlay {
  title: string;
  /** Moment-first headline shown on the card face and modal header. */
  headline: string;
  preview: string;
  draftBody: string;
  recipientLabel: string;
  channel: "Gmail" | "Slack" | "Note";
  confidence: number;
  etaLabel: string;
  playbookSlug: string;
  playbookName: string;
  section: "relationships" | "work" | "billing" | "meetings" | "communication" | "me";
  triggerSignal: string;
  evidence: DemoPlayEvidence[];
  artifacts?: DemoPlayArtifact[];
  targetOrgSlug?: string;
  sourceUrl?: string;
  triggerLabel?: string;
}

const DEMO_PLAYS: DemoPlay[] = [
  {
    title: "$50K deal closing — meeting prep + invoice ready",
    headline: "Catalyst call at 4pm, your proposal and deposit invoice are ready",
    preview: "Salt cross-referenced Calendar, Gmail, and Stripe. Proposal attached, invoice drafted, talking points ready.",
    draftBody: "Hi David,\n\nLooking forward to our call at 4pm! As discussed, I've attached the full Portfolio Brand Services proposal.\n\nQuick summary:\n• $50K/year for up to 5 portfolio companies\n• Dedicated brand strategist for each\n• 48-hour turnaround on urgent requests\n\nI've also included the Meridian Tech case study you asked about — they saw 3x content output in 90 days.\n\nSee you at 4!\n\nBest,\n[You]",
    recipientLabel: "David Liu",
    channel: "Gmail",
    confidence: 98,
    etaLabel: "Send before 4pm",
    playbookSlug: "meeting-prep",
    playbookName: "Meeting Prep",
    section: "meetings",
    triggerSignal: "Meeting in under 4 hours with an open proposal",
    evidence: [
      { label: "Saw the 4:00 PM Catalyst Ventures follow-up on your calendar", url: "https://calendar.google.com/calendar/event?eid=catalyst-4pm", appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Read David's last email asking for the portfolio pricing breakdown", url: "https://mail.google.com/mail/u/0/#inbox/demo-catalyst", appLabel: "Gmail", appId: "google" },
      { label: "Noticed the $25,000 deposit invoice is still a draft in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_catalyst", appLabel: "Stripe", appId: "stripe" },
    ],
    artifacts: [
      { appId: "stripe", label: "INV-2026-056 · $25,000 deposit (draft)", url: "https://dashboard.stripe.com/invoices/in_demo_catalyst" },
    ],
    targetOrgSlug: "catalyst-ventures",
    sourceUrl: "https://calendar.google.com/calendar/event?eid=catalyst-4pm",
    triggerLabel: "📅 Calendar + 📧 Gmail + 💳 Stripe",
  },
  {
    title: "Artisan overdue $4,750 — Stripe says card failed",
    headline: "Nina's payment failed 35 days ago, the nudge is drafted",
    preview: "Salt found the failed charge in Stripe, drafted a friendly nudge with updated payment link.",
    draftBody: "Hi Nina,\n\nHope you're well! Quick heads up — it looks like the payment for INV-2026-048 ($4,750) didn't go through. Stripe flagged a card issue on July 15.\n\nNo worries at all — here's a fresh payment link:\n→ [Pay $4,750 securely]\n\nLet me know if you'd prefer to switch to ACH or need to update your card on file.\n\nThanks!\n[You]",
    recipientLabel: "Nina Patel",
    channel: "Gmail",
    confidence: 94,
    etaLabel: "35 days overdue",
    playbookSlug: "invoice-reminder",
    playbookName: "Invoice Reminder",
    section: "billing",
    triggerSignal: "Invoice 35 days overdue with a failed charge",
    evidence: [
      { label: "Noticed INV-2026-048 ($4,750) is 35 days past due in Stripe", url: "https://dashboard.stripe.com/payments/pi_3abc123", appLabel: "Stripe", appId: "stripe" },
      { label: "Saw the card decline Stripe logged on July 15", url: "https://dashboard.stripe.com/payments/pi_3abc123", appLabel: "Stripe", appId: "stripe" },
      { label: "Checked Gmail, no reply from Nina since the first reminder", url: "https://mail.google.com/mail/u/0/#inbox/demo-artisan", appLabel: "Gmail", appId: "google" },
    ],
    targetOrgSlug: "artisan-coffee",
    sourceUrl: "https://dashboard.stripe.com/payments/pi_3abc123",
    triggerLabel: "💳 Stripe failed charge + 📧 Gmail",
  },
  {
    title: "Sarah's contract renews in 30 days — upsell ready",
    headline: "Evergreen renews Sept 30, the renewal + holiday upsell is drafted",
    preview: "Salt analyzed 6 months of Slack convos + invoices. She mentioned expansion 4x. Renewal + upsell proposal drafted.",
    draftBody: "Hi Sarah,\n\nCan you believe we're coming up on 6 months already? The Evergreen partnership has been incredible — 3 successful campaigns, 47% engagement lift, and that viral TikTok moment.\n\nYour current contract ($24K) renews Sept 30. Given the Holiday Campaign scope, I'd love to propose:\n\n• Renewed retainer: $28K (+$4K for expanded social)\n• Add-on: $45K Holiday Campaign (Oct-Dec)\n• Total partnership: $73K/year\n\nI've attached a detailed breakdown. Coffee this week to discuss?\n\nBest,\n[You]",
    recipientLabel: "Sarah Chen",
    channel: "Gmail",
    confidence: 96,
    etaLabel: "Renews in 30 days",
    playbookSlug: "contract-renewal-alert",
    playbookName: "Contract Renewal Alert",
    section: "billing",
    triggerSignal: "Recurring contract hits its 30-day renewal window",
    evidence: [
      { label: "Found the Brand Refresh contract renewing Sept 30 ($24K)", url: "https://dashboard.stripe.com/subscriptions/sub_demo_evergreen", appLabel: "Stripe", appId: "stripe" },
      { label: "Counted 4 expansion mentions from Sarah in #evergreen-salt this month", url: "https://app.slack.com/client/T01234/C56789", appLabel: "Slack", appId: "slack" },
      { label: "Saw the Holiday Campaign draft invoice ($45K) waiting in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_evergreen", appLabel: "Stripe", appId: "stripe" },
    ],
    targetOrgSlug: "evergreen-brands",
    sourceUrl: "https://app.slack.com/client/T01234/C56789",
    triggerLabel: "💬 Slack mentions + 💳 Stripe history + 📅 Contract date",
  },
  {
    title: "Tomorrow's kickoff missing scope doc — found it in Drive",
    headline: "Kickoff with Michael tomorrow at 11am, scope doc found and attached",
    preview: "Salt checked Calendar, saw no attachment in the invite. Found scope doc in Drive, attached it, drafted reminder.",
    draftBody: "Hi Michael,\n\nQuick note before our kickoff tomorrow at 11am — I noticed the scope document wasn't attached to the calendar invite.\n\nI've attached it here for easy reference:\n• Vertex Website Redesign - Scope v2.pdf\n• Timeline & Milestones\n• Photography shot list\n\nCan't wait to get started! See you at 11.\n\nBest,\n[You]",
    recipientLabel: "Michael Torres",
    channel: "Gmail",
    confidence: 97,
    etaLabel: "Meeting tomorrow",
    playbookSlug: "meeting-prep",
    playbookName: "Meeting Prep",
    section: "meetings",
    triggerSignal: "Kickoff within 24 hours with no scope doc attached",
    evidence: [
      { label: "Saw the Vertex kickoff tomorrow at 11:00 AM on your calendar", url: "https://calendar.google.com/calendar/event?eid=vertex-kickoff", appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Noticed the invite has no attachments", url: "https://calendar.google.com/calendar/event?eid=vertex-kickoff", appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Found \"Vertex Website Redesign - Scope v2.pdf\" in your Drive", url: "https://drive.google.com/file/d/scope-doc-vertex", appLabel: "Google Drive", appId: "google-drive" },
    ],
    artifacts: [
      { appId: "google-drive", label: "Vertex Website Redesign - Scope v2.pdf", url: "https://drive.google.com/file/d/scope-doc-vertex" },
    ],
    targetOrgSlug: "vertex-architecture",
    sourceUrl: "https://drive.google.com/file/d/scope-doc-vertex",
    triggerLabel: "📅 Calendar + 📁 Drive + 📧 Gmail",
  },
  {
    title: "Amanda mentioned video 4x — $60K upsell opportunity",
    headline: "Amanda asked about video again, the $60K proposal is drafted",
    preview: "Salt analyzed Slack history + meeting notes. She's ready. Proposal + calendar invite drafted.",
    draftBody: "Hi Amanda,\n\nI've been thinking about our last few conversations — you mentioned video 4 times in the past month, and I think you're absolutely right that it's time.\n\nLuna's national expansion deserves to be documented. I put together a video package:\n\n• $5K/month ($60K/year commitment)\n• 4 short-form + 1 long-form monthly\n• First video: Your founder story\n\nI blocked Thursday 2pm for us to discuss — calendar invite attached. Let me know if another time works better.\n\nBest,\n[You]",
    recipientLabel: "Amanda Foster",
    channel: "Gmail",
    confidence: 92,
    etaLabel: "Hot lead",
    playbookSlug: "upsell-opportunity",
    playbookName: "Upsell Opportunity",
    section: "relationships",
    triggerSignal: "Client mentioned an unpurchased service 4 times in 30 days",
    evidence: [
      { label: "Counted 4 video mentions from Amanda in Slack this month", url: "https://app.slack.com/client/T01234/D78901", appLabel: "Slack", appId: "slack" },
      { label: "Re-read the July retro notes, national expansion is the priority", url: "https://calendar.google.com/calendar/event?eid=luna-retro", appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Confirmed no video line item on any Luna invoice in Stripe", url: "https://dashboard.stripe.com/customers/cus_demo_luna", appLabel: "Stripe", appId: "stripe" },
    ],
    targetOrgSlug: "luna-wellness",
    sourceUrl: "https://app.slack.com/client/T01234/D78901",
    triggerLabel: "💬 Slack (4 mentions) + 📅 Calendar + 📧 Gmail",
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
  // Evergreen history — deep billing trail so the hub node shows payment density
  { orgSlug: "evergreen-brands", number: "INV-2026-038", amountCents: 900000, status: "paid", issuedDaysAgo: 72, paidDaysAgo: 60, description: "Influencer Program - May" },
  { orgSlug: "evergreen-brands", number: "INV-2026-031", amountCents: 800000, status: "paid", issuedDaysAgo: 130, paidDaysAgo: 118, description: "Spring Lookbook - Final" },
  { orgSlug: "evergreen-brands", number: "INV-2026-027", amountCents: 700000, status: "paid", issuedDaysAgo: 160, paidDaysAgo: 150, description: "Spring Lookbook - Deposit" },
  { orgSlug: "evergreen-brands", number: "INV-2026-059", amountCents: 700000, status: "due", issuedDaysAgo: 2, description: "Retail Launch Kit - Milestone 1" },
  { orgSlug: "evergreen-brands", number: "INV-2026-044", amountCents: 900000, status: "paid", issuedDaysAgo: 45, paidDaysAgo: 35, description: "Influencer Program - June" },
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
  // PAST Evergreen meetings — history trail so the hub node shows meeting density
  { title: "Evergreen - Brand Refresh Review", daysFromNow: -3, hour: 13, durationMinutes: 60, meetingType: "review", notes: "Phase 2 sign-off, engagement numbers up 47%", orgSlug: "evergreen-brands", personName: "Sarah Chen" },
  { title: "Evergreen - Influencer Program Sync", daysFromNow: -6, hour: 11, durationMinutes: 30, meetingType: "check-in", notes: "Creator shortlist review with Priya", orgSlug: "evergreen-brands", personName: "Priya Nair" },
  { title: "Evergreen - Retail Kit Walkthrough", daysFromNow: -9, hour: 15, durationMinutes: 45, meetingType: "review", notes: "Display mockups with Lisa, print vendor timing", orgSlug: "evergreen-brands", personName: "Lisa Chang" },
  { title: "Evergreen - Holiday Concepts Pitch", daysFromNow: -13, hour: 10, durationMinutes: 90, meetingType: "review", notes: "First concepts round with Sarah and Marcus", orgSlug: "evergreen-brands", personName: "Marcus Williams" },
  { title: "Evergreen - PR Strategy Session", daysFromNow: -17, hour: 14, durationMinutes: 45, meetingType: "check-in", notes: "Launch PR angles with Jordan", orgSlug: "evergreen-brands", personName: "Jordan Reyes" },
  { title: "Evergreen - Creative Direction", daysFromNow: -21, hour: 11, durationMinutes: 60, meetingType: "check-in", notes: "Photography direction with Tom", orgSlug: "evergreen-brands", personName: "Tom Bradley" },
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
// needs_you → HQ "Heads up" rail + Plays Needs You queue.
// auto_handled → HQ "Auto-handled" stack (HQ reads findings, not play_runs,
// for that section). Memory-care style entries carry evidence.metadata
// { memory_care_profile, profile_field, profile_value } so the handled card
// renders a concrete change line ("relationship → Client").
interface DemoFinding {
  findingType: "revenue_closing" | "revenue_risk" | "revenue_upsell" | "pending_deliverable" | "pending_reply";
  title: string;
  content: string;
  confidence: number;
  orgSlug?: string;
  personName?: string;
}

const DEMO_FINDINGS: DemoFinding[] = [
  { findingType: "revenue_risk", title: "Catalyst deal going cold", content: "No response from David Liu in 12 days. $50K deal may slip to next quarter.", confidence: 78, orgSlug: "catalyst-ventures", personName: "David Liu" },
  { findingType: "pending_reply", title: "Artisan Coffee invoice inquiry", content: "Nina asked about payment terms yesterday. Hasn't received response.", confidence: 85, orgSlug: "artisan-coffee", personName: "Nina Patel" },
  { findingType: "pending_deliverable", title: "Meridian launch content due Aug 15", content: "Product launch assets deadline in 1 week. Video brief still pending.", confidence: 90, orgSlug: "meridian-tech", personName: "James Park" },
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
  await supabase.from("activity_entries").delete().eq("workspace_id", workspaceId);
  await supabase.from("proposals").delete().eq("workspace_id", workspaceId);
  await supabase.from("billing_records").delete().eq("workspace_id", workspaceId);
  await supabase.from("play_runs").delete().eq("workspace_id", workspaceId);
  await supabase.from("opportunity_gaps").delete().eq("workspace_id", workspaceId);
  await supabase.from("meetings").delete().eq("workspace_id", workspaceId);
  await supabase.from("work").delete().eq("workspace_id", workspaceId);
  await supabase.from("resources").delete().eq("workspace_id", workspaceId);
  await supabase.from("entity_links").delete().eq("workspace_id", workspaceId);
  await supabase.from("notes").delete().eq("workspace_id", workspaceId);
  await supabase.from("people").delete().eq("workspace_id", workspaceId);
  await supabase.from("organizations").delete().eq("workspace_id", workspaceId);

  // Reset the auto-handled watermark — reseeded handled items should be
  // "unreviewed" so the Auto-handled tab shows them on first view.
  await supabase
    .from("workspaces")
    .update({ auto_handled_seen_at: null })
    .eq("id", workspaceId);

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
        relationship_health_band: org.healthBand,
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
        source: "system",
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

  // Queued plays — full v2 attribution so cards and the detail modal render
  // the rich layout (headline, section identity, draft, evidence, artifacts).
  for (const play of DEMO_PLAYS) {
    const targetOrgId = play.targetOrgSlug ? orgIds.get(play.targetOrgSlug) : undefined;
    const targetOrg = DEMO_ORGS.find((o) => o.slug === play.targetOrgSlug);

    const { error } = await supabase.from("play_runs").insert({
      workspace_id: workspaceId,
      state: "queued",
      queue: "needs_you",
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
      source_context: {
        source: "playbook",
        playbook_slug: play.playbookSlug,
        trigger_signal: play.triggerSignal,
      },
      metadata: {
        section: play.section,
        layer: "act",
        output_type: "email_draft",
        playbook_name: play.playbookName,
        headline: play.headline,
        evidence: play.evidence,
        artifacts: play.artifacts ?? [],
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

  // Auto-handled plays (for the Auto-handled tab, Activity, and the HQ
  // time-saved widget). Three requirements that are easy to miss:
  //   1. queue = "auto_handled" — listAutoHandledPlayRuns filters on it;
  //      without it these runs are invisible on the Auto-handled tab.
  //   2. source_context.playbook_slug pointing at a live act-layer v2
  //      playbook — the Activity tab allowlist drops unattributed rows, and
  //      the HQ time-saved widget prices runs via the playbook's
  //      value.estimate. No slug → no Activity row → 0 minutes saved.
  //   3. created_at backdated with ran_at — the stats window and the
  //      Activity ordering both read creation/update timestamps.
  //   4. metadata.output_type must match the playbook's declared output —
  //      the card mapper derives the body kind from it, and email_draft
  //      without a draft_body fails validation (card silently dropped).
  //      Ran email plays keep their sent body in draft_body, like the
  //      executor leaves it.
  //   5. headline/evidence/artifacts/trigger_signal — the handled card and
  //      its modal render the same rich anatomy as the queue card only when
  //      these are present; otherwise you get a bare title + preview.
  const executedPlays: {
    title: string;
    headline: string;
    preview: string;
    daysAgo: number;
    stakes: "low" | "medium" | "high";
    channel: "Gmail" | "Slack" | "Note";
    recipientLabel: string;
    playbookSlug: string;
    playbookName: string;
    section: string;
    outputType: "email_draft" | "briefing" | "notification";
    triggerSignal: string;
    evidence: DemoPlayEvidence[];
    artifacts?: DemoPlayArtifact[];
    sentBody?: string;
  }[] = [
    // TODAY - impressive overnight/early morning auto-actions
    {
      title: "Meeting brief prepped: Catalyst Ventures 4pm", headline: "Your 4pm Catalyst brief is ready", daysAgo: 0, stakes: "high", channel: "Note", recipientLabel: "David Liu", preview: "Assembled case studies, talking points, and $50K deal history for David Liu", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Meeting in under 4 hours with an open proposal",
      evidence: [
        { label: "Saw the 4:00 PM Catalyst Ventures follow-up on your calendar", url: "https://calendar.google.com/calendar/event?eid=catalyst-4pm", appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Read David's last email asking for the portfolio pricing breakdown", url: "https://mail.google.com/mail/u/0/#inbox/demo-catalyst", appLabel: "Gmail", appId: "google" },
        { label: "Noticed the $25,000 deposit invoice is still a draft in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_catalyst", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "google", label: "Catalyst meeting brief (Notes)", url: "https://docs.google.com/document/d/demo-catalyst-brief" }],
    },
    {
      title: "Meeting brief prepped: Meridian Tech 2pm", headline: "Your 2pm Meridian brief is ready", daysAgo: 0, stakes: "high", channel: "Note", recipientLabel: "James Park", preview: "Launch timeline, content status, deliverables checklist for James", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Weekly sync in under 4 hours",
      evidence: [
        { label: "Saw the 2:00 PM Meridian weekly sync on your calendar", url: "https://calendar.google.com/calendar/event?eid=meridian-2pm", appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Pulled the launch checklist from #meridian-salt in Slack", url: "https://slack.com/archives/demo-meridian", appLabel: "Slack", appId: "slack" },
      ],
      artifacts: [{ appId: "google", label: "Meridian launch brief (Notes)", url: "https://docs.google.com/document/d/demo-meridian-brief" }],
    },
    {
      title: "Invoice sent: Luna Wellness August retainer", headline: "Amanda's August retainer invoice went out", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Amanda Foster", preview: "Auto-generated and sent INV-2026-057 for $6,500", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Retainer invoice due on the 1st of the month",
      evidence: [
        { label: "Noticed the August retainer was due and uninvoiced in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_luna", appLabel: "Stripe", appId: "stripe" },
        { label: "Matched the $6,500 amount to the signed retainer email", url: "https://mail.google.com/mail/u/0/#inbox/demo-luna-retainer", appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-057 · $6,500 (sent)", url: "https://dashboard.stripe.com/invoices/in_demo_luna" }],
      sentBody: "Hi Amanda,\n\nYour August retainer invoice is ready — INV-2026-057 for $6,500.\n\nPay securely here: [payment link]\n\nThanks as always!\n[You]",
    },
    {
      title: "Follow-up sent: Evergreen Q3 check-in", headline: "Sarah got the Q3 check-in", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Brand refresh progress update, seeded holiday campaign discussion", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "No reply in 6 days on an active engagement",
      evidence: [
        { label: "Noticed Sarah hasn't replied since the Phase 2 update 6 days ago", url: "https://mail.google.com/mail/u/0/#inbox/demo-evergreen-q3", appLabel: "Gmail", appId: "google" },
        { label: "Read her Slack reaction to the engagement numbers on Friday", url: "https://slack.com/archives/demo-evergreen", appLabel: "Slack", appId: "slack" },
      ],
      sentBody: "Hi Sarah,\n\nQuick check-in on the brand refresh — Phase 2 wraps Friday and engagement is tracking 47% above baseline.\n\nWith Q4 around the corner, worth sketching the holiday campaign soon. Want me to put together concepts?\n\nBest,\n[You]",
    },
    {
      title: "Invoice reminder: Artisan Coffee overdue", headline: "Nina got a friendly nudge on INV-2026-048", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Nina Patel", preview: "Payment reminder for INV-2026-048 ($4,750) - 5 days overdue", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Invoice 5 days past due",
      evidence: [
        { label: "Noticed INV-2026-048 ($4,750) crossed 5 days past due in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_artisan", appLabel: "Stripe", appId: "stripe" },
        { label: "Checked Gmail — no reply from Nina since the invoice went out", url: "https://mail.google.com/mail/u/0/#inbox/demo-artisan", appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-048 · $4,750 (overdue)", url: "https://dashboard.stripe.com/invoices/in_demo_artisan" }],
      sentBody: "Hi Nina,\n\nFriendly reminder that INV-2026-048 ($4,750) is a few days past due.\n\nHere's the payment link: [payment link]\n\nThanks!\n[You]",
    },
    {
      title: "Proposal sent: Catalyst portfolio services", headline: "David has the $50K portfolio proposal", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "David Liu", preview: "Attached $50K proposal ahead of today's meeting", playbookSlug: "upsell-opportunity", playbookName: "Upsell Opportunity", section: "relationships", outputType: "email_draft", triggerSignal: "Meeting today with an open proposal",
      evidence: [
        { label: "Saw the 4:00 PM call with David on your calendar", url: "https://calendar.google.com/calendar/event?eid=catalyst-4pm", appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Read his email asking for portfolio pricing before the call", url: "https://mail.google.com/mail/u/0/#inbox/demo-catalyst", appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "google", label: "Portfolio Brand Services proposal.pdf", url: "https://docs.google.com/document/d/demo-catalyst-proposal" }],
      sentBody: "Hi David,\n\nAhead of our call — the full Portfolio Brand Services proposal is attached.\n\n• $50K/year for up to 5 portfolio companies\n• Dedicated strategist for each\n• 48-hour turnaround on urgent requests\n\nSee you at 4!\n\nBest,\n[You]",
    },
    {
      title: "Weekly digest: Meridian content pipeline", headline: "Meridian's weekly digest posted to Slack", daysAgo: 0, stakes: "medium", channel: "Slack", recipientLabel: "#meridian-salt", preview: "Shared content status in #meridian-salt channel - 3/5 complete", playbookSlug: "email-digest", playbookName: "Email Digest", section: "communication", outputType: "briefing", triggerSignal: "Weekly digest schedule (Fridays 9am)",
      evidence: [
        { label: "Compiled the week's content status from the Meridian work board", url: "https://slack.com/archives/demo-meridian", appLabel: "Slack", appId: "slack" },
        { label: "Cross-checked Elena's latest draft submissions in Gmail", url: "https://mail.google.com/mail/u/0/#inbox/demo-meridian", appLabel: "Gmail", appId: "google" },
      ],
    },
    {
      title: "Calendar hold: Studio Collective intro", headline: "Held 30 minutes for the Alex Rivera intro", daysAgo: 0, stakes: "medium", channel: "Note", recipientLabel: "Alex Rivera", preview: "Blocked 30min tomorrow for new lead call with Alex Rivera", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "New lead asked for a call",
      evidence: [
        { label: "Read Alex's LinkedIn inquiry asking for an intro call", url: "https://mail.google.com/mail/u/0/#inbox/demo-studio", appLabel: "Gmail", appId: "google" },
        { label: "Found a free 30-minute block tomorrow at 3:00 PM", url: "https://calendar.google.com/calendar/event?eid=studio-intro", appLabel: "Google Calendar", appId: "google-calendar" },
      ],
    },
    {
      title: "Status update: Vertex Architecture", headline: "Michael got the Phase 1 status update", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Michael Torres", preview: "Shared website redesign Phase 1 progress - on track", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Weekly status cadence for active work",
      evidence: [
        { label: "Pulled Phase 1 progress from the Vertex work board", url: "https://mail.google.com/mail/u/0/#inbox/demo-vertex", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Michael,\n\nPhase 1 of the redesign is on track — wireframes approved, homepage in build.\n\nFull status board: [link]\n\nBest,\n[You]",
    },
    {
      title: "Contract renewal alert: Horizon Fitness", headline: "Chris got the 30-day renewal heads-up", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Chris Anderson", preview: "30-day notice sent for $22K Location Launch Kit renewal", playbookSlug: "contract-renewal-alert", playbookName: "Contract Renewal Alert", section: "billing", outputType: "email_draft", triggerSignal: "Contract renews in 30 days",
      evidence: [
        { label: "Noticed the Location Launch Kit agreement renews in 30 days", url: "https://dashboard.stripe.com/invoices/in_demo_horizon", appLabel: "Stripe", appId: "stripe" },
        { label: "Read Chris's email about the 3 new gym locations", url: "https://mail.google.com/mail/u/0/#inbox/demo-horizon", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Chris,\n\nHeads up that the Location Launch Kit agreement renews in 30 days.\n\nGiven the 3 new locations, I'd love to walk you through the expanded package. Coffee this week?\n\nBest,\n[You]",
    },
    {
      title: "Meeting notes shared: Luna Wellness", headline: "Luna call notes posted to Slack", daysAgo: 0, stakes: "medium", channel: "Slack", recipientLabel: "#luna-wellness", preview: "Posted last call notes + video upsell talking points", playbookSlug: "meeting-recap", playbookName: "Meeting Recap", section: "meetings", outputType: "notification", triggerSignal: "Meeting ended 30 minutes ago",
      evidence: [
        { label: "Saw the Luna Wellness monthly review ended at 2:30 PM", url: "https://calendar.google.com/calendar/event?eid=luna-review", appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Formatted the recap for #luna-wellness in Slack", url: "https://slack.com/archives/demo-luna", appLabel: "Slack", appId: "slack" },
      ],
    },
    {
      title: "Lead response: Studio Collective", headline: "Alex got a warm reply with your availability", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Alex Rivera", preview: "Warm response to Alex's LinkedIn inquiry with availability", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Inbound lead inquiry unanswered for 2 days",
      evidence: [
        { label: "Read Alex's inquiry about strategy sprints", url: "https://mail.google.com/mail/u/0/#inbox/demo-studio", appLabel: "Gmail", appId: "google" },
        { label: "Checked your calendar for two open intro slots", url: "https://calendar.google.com/calendar/event?eid=studio-intro", appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      sentBody: "Hi Alex,\n\nThanks for reaching out! Strategy sprints are exactly what we do.\n\nI have Thursday 3pm or Friday 10am open for an intro call — either work?\n\nBest,\n[You]",
    },
    {
      title: "Thank you sent: Evergreen Brands", headline: "Sarah got a thank-you note", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Appreciation note to Sarah for Q3 brand refresh partnership", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Milestone completed (Phase 2 sign-off)",
      evidence: [
        { label: "Saw Sarah approve the Phase 2 designs in the refresh thread", url: "https://mail.google.com/mail/u/0/#inbox/demo-evergreen-q3", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Sarah,\n\nJust wanted to say thanks — the Q3 refresh has been a joy to work on. The results speak for themselves.\n\nBest,\n[You]",
    },
    {
      title: "Project brief created: Horizon Fitness", headline: "Horizon launch brief is in your notes", daysAgo: 0, stakes: "high", channel: "Note", recipientLabel: "Horizon Fitness", preview: "Location launch kit scope, timeline, and deliverables documented", playbookSlug: "daily-briefing", playbookName: "Daily Briefing", section: "me", outputType: "briefing", triggerSignal: "New work item created without a brief",
      evidence: [
        { label: "Read the signed Location Launch Kit scope in Gmail", url: "https://mail.google.com/mail/u/0/#inbox/demo-horizon", appLabel: "Gmail", appId: "google" },
        { label: "Pulled the launch dates from your calendar", url: "https://calendar.google.com/calendar/event?eid=horizon-launch", appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      artifacts: [{ appId: "google", label: "Horizon location launch brief (Notes)", url: "https://docs.google.com/document/d/demo-horizon-brief" }],
    },
    // YESTERDAY - more high-value plays
    {
      title: "Invoice sent: Evergreen monthly", headline: "Sarah got the $12,000 brand refresh invoice", daysAgo: 1, stakes: "high", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Auto-generated INV-2026-058 for $12,000 brand refresh", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Monthly billing cycle",
      evidence: [
        { label: "Noticed the July brand refresh invoice was due in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_evergreen", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-058 · $12,000 (sent)", url: "https://dashboard.stripe.com/invoices/in_demo_evergreen" }],
      sentBody: "Hi Sarah,\n\nThis month's brand refresh invoice is ready — INV-2026-058 for $12,000.\n\nPay securely here: [payment link]\n\nThanks!\n[You]",
    },
    {
      title: "Meeting prep: Evergreen Q4 kickoff", headline: "Your Q4 kickoff brief is ready", daysAgo: 1, stakes: "high", channel: "Note", recipientLabel: "Sarah Chen", preview: "Campaign concepts, budget breakdown, timeline for $45K project", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Kickoff scheduled with a draft proposal",
      evidence: [
        { label: "Saw the Q4 campaign kickoff on tomorrow's calendar", url: "https://calendar.google.com/calendar/event?eid=evergreen-q4", appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Pulled the $45K holiday campaign proposal scope", url: "https://mail.google.com/mail/u/0/#inbox/demo-evergreen-q4", appLabel: "Gmail", appId: "google" },
      ],
    },
    {
      title: "Follow-up sent: Bloom Creative", headline: "Jessica got a July deliverables check-in", daysAgo: 1, stakes: "medium", channel: "Gmail", recipientLabel: "Jessica Bloom", preview: "Photo support retainer check-in for July deliverables", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Deliverables due with no recent reply",
      evidence: [
        { label: "Noticed the July photo deliverables window closing", url: "https://mail.google.com/mail/u/0/#inbox/demo-bloom", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Jessica,\n\nChecking in on July photo deliverables — everything you need from our side?\n\nBest,\n[You]",
    },
    {
      title: "Calendar hold: Evergreen campaign kickoff", headline: "Blocked 90 minutes for the campaign kickoff", daysAgo: 1, stakes: "low", channel: "Note", recipientLabel: "Sarah Chen", preview: "Blocked 90min tomorrow based on email thread", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Email thread proposed a kickoff time",
      evidence: [
        { label: "Read Sarah's email proposing a kickoff this week", url: "https://mail.google.com/mail/u/0/#inbox/demo-evergreen-q4", appLabel: "Gmail", appId: "google" },
        { label: "Found a 90-minute opening tomorrow at 10:00 AM", url: "https://calendar.google.com/calendar/event?eid=evergreen-q4", appLabel: "Google Calendar", appId: "google-calendar" },
      ],
    },
    // THIS WEEK
    {
      title: "Proposal follow-up: Vertex Phase 2", headline: "Michael got a gentle nudge on Phase 2", daysAgo: 2, stakes: "high", channel: "Gmail", recipientLabel: "Michael Torres", preview: "Gentle nudge on $9K Phase 2 website expansion", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Proposal viewed but unanswered for 5 days",
      evidence: [
        { label: "Saw Michael open the Phase 2 proposal twice this week", url: "https://mail.google.com/mail/u/0/#inbox/demo-vertex", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Michael,\n\nCircling back on the Phase 2 proposal ($9K) — happy to answer questions or adjust scope.\n\nBest,\n[You]",
    },
    {
      title: "Invoice sent: Horizon deposit", headline: "Chris got the $11,000 deposit invoice", daysAgo: 3, stakes: "high", channel: "Gmail", recipientLabel: "Chris Anderson", preview: "Auto-generated INV-2026-056 for $11,000 location kit deposit", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Signed agreement received, deposit due",
      evidence: [
        { label: "Read the signed Location Launch Kit agreement in Gmail", url: "https://mail.google.com/mail/u/0/#inbox/demo-horizon", appLabel: "Gmail", appId: "google" },
        { label: "Created the 50% deposit invoice in Stripe", url: "https://dashboard.stripe.com/invoices/in_demo_horizon_deposit", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-056 · $11,000 (sent)", url: "https://dashboard.stripe.com/invoices/in_demo_horizon_deposit" }],
      sentBody: "Hi Chris,\n\nThe Location Launch Kit deposit invoice is ready — INV-2026-056 for $11,000.\n\nPay securely here: [payment link]\n\nThanks!\n[You]",
    },
    {
      title: "Thank you sent: Artisan Coffee", headline: "Nina got a thank-you for the summer campaign", daysAgo: 4, stakes: "medium", channel: "Gmail", recipientLabel: "Nina Patel", preview: "Post-campaign appreciation to Nina for summer collab", playbookSlug: "payment-received", playbookName: "Payment Received", section: "billing", outputType: "email_draft", triggerSignal: "Payment received in Stripe",
      evidence: [
        { label: "Saw Nina's payment clear in Stripe", url: "https://dashboard.stripe.com/payments/pi_demo_artisan", appLabel: "Stripe", appId: "stripe" },
      ],
      sentBody: "Hi Nina,\n\nPayment received — thank you! The summer campaign was a pleasure.\n\nBest,\n[You]",
    },
    {
      title: "Intro scheduled: Studio Collective", headline: "Alex got your booking link", daysAgo: 5, stakes: "medium", channel: "Gmail", recipientLabel: "Alex Rivera", preview: "Auto-replied to Alex's inquiry with Calendly link", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Inbound lead inquiry",
      evidence: [
        { label: "Read Alex's LinkedIn inquiry about strategy sprints", url: "https://mail.google.com/mail/u/0/#inbox/demo-studio", appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Hi Alex,\n\nGreat to hear from you! Grab any slot that works: [calendar link]\n\nBest,\n[You]",
    },
  ];

  for (const play of executedPlays) {
    const ranAt = new Date();
    ranAt.setDate(ranAt.getDate() - play.daysAgo);

    const { data: run, error } = await supabase
      .from("play_runs")
      .insert({
        workspace_id: workspaceId,
        state: "ran",
        queue: "auto_handled",
        title: play.title,
        preview: play.preview,
        stakes: play.stakes,
        ran_at: ranAt.toISOString(),
        created_at: ranAt.toISOString(),
        channel: play.channel ?? "Gmail",
        confidence: 95,
        recipient_label: play.recipientLabel,
        draft_body: play.sentBody ?? null,
        source_context: {
          source: "playbook",
          playbook_slug: play.playbookSlug,
          trigger_signal: play.triggerSignal,
        },
        metadata: {
          section: play.section,
          layer: "act",
          output_type: play.outputType,
          playbook_name: play.playbookName,
          headline: play.headline,
          evidence: play.evidence,
          artifacts: play.artifacts ?? [],
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ ${play.title}: ${error.message}`);
      continue;
    }

    // Activity entry per run, mirroring play-record.ts — the Activity tab
    // renders the per-run timeline from these rows.
    await supabase.from("activity_entries").insert({
      workspace_id: workspaceId,
      play_run_id: run.id,
      action: "auto_applied",
      title: play.title,
      detail: play.preview,
      created_at: ranAt.toISOString(),
      metadata: {
        queue: "auto_handled",
        stakes: play.stakes,
        confidence: 95,
        source: "playbook",
        auto_executed: true,
      },
    });

    console.log(`  ✓ ${play.title} (ran, auto-handled)`);
  }

  // Scheduled plays — power HQ "Coming up" and the automations list.
  const scheduledPlays = [
    { title: "Daily briefing for tomorrow", inDays: 1, hour: 8, playbookSlug: "daily-briefing", playbookName: "Daily Briefing", section: "me", preview: "Salt will assemble tomorrow's briefing at 8am" },
    { title: "Weekly digest: client status roundup", inDays: 2, hour: 9, playbookSlug: "email-digest", playbookName: "Email Digest", section: "communication", preview: "Salt will compile the weekly client digest Monday at 9am" },
  ];

  for (const play of scheduledPlays) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + play.inDays);
    scheduledFor.setHours(play.hour, 0, 0, 0);

    const { error } = await supabase.from("play_runs").insert({
      workspace_id: workspaceId,
      state: "scheduled",
      queue: "auto_handled",
      title: play.title,
      preview: play.preview,
      scheduled_for: scheduledFor.toISOString(),
      channel: "Note",
      confidence: 95,
      source_context: {
        source: "playbook",
        playbook_slug: play.playbookSlug,
      },
      metadata: {
        section: play.section,
        layer: "act",
        playbook_name: play.playbookName,
      },
    });

    if (error) {
      console.error(`  ✗ ${play.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${play.title} (scheduled +${play.inDays}d)`);
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

// Proposals drive the HQ pipeline stat card ("$XK in proposals").
async function seedProposals(workspaceId: string) {
  console.log(`\nSeeding proposals (3)...`);

  const proposals = [
    { title: "Evergreen Holiday Campaign", totalAmount: 45000, status: "sent", daysAgo: 3 },
    { title: "Catalyst Portfolio Brand Services", totalAmount: 50000, status: "viewed", daysAgo: 1 },
    { title: "Studio Collective Strategy Sprint", totalAmount: 12000, status: "draft", daysAgo: 0 },
  ];

  for (const proposal of proposals) {
    const updatedAt = new Date();
    updatedAt.setDate(updatedAt.getDate() - proposal.daysAgo);

    const { error } = await supabase.from("proposals").insert({
      workspace_id: workspaceId,
      title: proposal.title,
      total_amount: proposal.totalAmount,
      status: proposal.status,
      updated_at: updatedAt.toISOString(),
    });

    if (error) {
      console.error(`  ✗ ${proposal.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${proposal.title} (${proposal.status}, $${proposal.totalAmount.toLocaleString()})`);
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

async function seedFindings(
  workspaceId: string,
  orgIds: Map<string, string>,
  personIds: Map<string, string>,
) {
  console.log(`\nSeeding intelligence findings (${DEMO_FINDINGS.length} needs_you)...`);

  for (const finding of DEMO_FINDINGS) {
    const orgId = finding.orgSlug ? orgIds.get(finding.orgSlug) : null;
    const personId = finding.personName ? personIds.get(finding.personName) : null;

    const { error } = await supabase.from("intelligence_findings").insert({
      workspace_id: workspaceId,
      finding_type: finding.findingType,
      title: finding.title,
      content: finding.content,
      confidence: finding.confidence,
      org_id: orgId,
      person_id: personId,
      state: "needs_you",
    });

    if (error) {
      console.error(`  ✗ ${finding.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${finding.title} (needs you)`);
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

// Notes power the Memory Map's note nodes — a note only appears on the graph
// if it has at least one entity_links row with relation_type = 'mention'
// (the wikilink sync path writes these with source = 'system'). The extra
// 'related' edges below add cross-links the FK projections don't cover.
async function seedNotes(
  workspaceId: string,
  userId: string,
  orgIds: Map<string, string>,
  personIds: Map<string, string>,
) {
  console.log(`\nSeeding notes + graph cross-links...`);

  const evergreenId = orgIds.get("evergreen-brands");

  // Resolve work IDs by name (seedWork generates slugs; names are unique here)
  const { data: workRows } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  const workIdsByName = new Map((workRows ?? []).map((w) => [w.name, w.id]));

  const notes: {
    title: string;
    content: string;
    category: "note" | "idea" | "reference" | "reflection";
    daysAgo: number;
    mentions: { type: "org" | "person" | "work"; id: string }[];
  }[] = [
    {
      title: "Evergreen holiday campaign ideas",
      content: "# Evergreen holiday campaign ideas\n\nSarah wants three concepts by kickoff:\n\n- 'Evergreen Everwhere' — UGC-led, creators unbox the holiday collection\n- 'Rooted' — heritage angle, 10-year brand story\n- 'The Gift of Green' — sustainability-first, recycled packaging hero\n\nMarcus prefers Rooted. Priya thinks UGC wins on TikTok. Budget conversation happens at kickoff.",
      category: "idea",
      daysAgo: 2,
      mentions: [
        { type: "org", id: evergreenId! },
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "work", id: workIdsByName.get("Holiday Campaign 2026")! },
      ],
    },
    {
      title: "Sarah Chen — working style",
      content: "# Sarah Chen — working style\n\n- Decides fast when given options, hates open-ended questions\n- Prefers Slack over email for anything urgent\n- Champion for us internally — sold the holiday campaign to her CEO\n- Kids' soccer Saturdays, never schedule Monday 8am",
      category: "reference",
      daysAgo: 5,
      mentions: [
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "org", id: evergreenId! },
      ],
    },
    {
      title: "Brand refresh retrospective",
      content: "# Brand refresh retrospective\n\nWhat worked:\n- Engagement +47% after phase 1 launch\n- Tom's photography direction nailed the premium feel\n\nWhat to change for the holiday campaign:\n- Start retail assets 3 weeks earlier (Lisa got burned by print lead times)\n- Loop PR in from day one — Jordan found out about the launch from Instagram",
      category: "reflection",
      daysAgo: 8,
      mentions: [
        { type: "org", id: evergreenId! },
        { type: "work", id: workIdsByName.get("Brand Refresh Q3")! },
        { type: "person", id: personIds.get("Tom Bradley")! },
        { type: "person", id: personIds.get("Lisa Chang")! },
        { type: "person", id: personIds.get("Jordan Reyes")! },
      ],
    },
    {
      title: "Retail launch checklist",
      content: "# Retail launch checklist\n\n- [ ] Display units confirmed with vendor\n- [ ] Lisa signs off on in-store photography\n- [ ] Influencer seeding boxes ship 2 weeks before launch\n- [ ] PR embargo lifts on launch day\n\nCross-reference the influencer program calendar.",
      category: "note",
      daysAgo: 4,
      mentions: [
        { type: "work", id: workIdsByName.get("Retail Launch Kit")! },
        { type: "work", id: workIdsByName.get("Influencer Program")! },
        { type: "person", id: personIds.get("Lisa Chang")! },
        { type: "org", id: evergreenId! },
      ],
    },
    {
      title: "Meridian launch — lessons",
      content: "# Meridian launch — lessons\n\nJames moves fast and expects us to match. Content engine is working; the Aug 15 launch date is immovable because of their board meeting.",
      category: "note",
      daysAgo: 6,
      mentions: [
        { type: "org", id: orgIds.get("meridian-tech")! },
        { type: "person", id: personIds.get("James Park")! },
        { type: "work", id: workIdsByName.get("Product Launch Support")! },
      ],
    },
    {
      title: "Pricing thoughts for 2027",
      content: "# Pricing thoughts for 2027\n\nRetainers underpriced relative to project work. Luna retainer is 20% below market. Raise at renewal.",
      category: "idea",
      daysAgo: 12,
      mentions: [{ type: "org", id: orgIds.get("luna-wellness")! }],
    },
    {
      title: "David Liu intro",
      content: "# David Liu intro\n\nMet David through Sarah Chen at the SaaS Growth Summit. Catalyst's portfolio companies all need brand work — this could be the biggest door we walk through this year.",
      category: "note",
      daysAgo: 15,
      mentions: [
        { type: "person", id: personIds.get("David Liu")! },
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "org", id: orgIds.get("catalyst-ventures")! },
      ],
    },
    {
      title: "Studio day — August",
      content: "# Studio day — August\n\nBlocked Friday for admin, invoicing, and portfolio updates. No client calls.",
      category: "note",
      daysAgo: 1,
      mentions: [],
    },
  ];

  for (const note of notes) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - note.daysAgo);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        workspace_id: workspaceId,
        title: note.title,
        content: note.content,
        category: note.category,
        author_type: "user",
        source: "manual",
        created_by: userId,
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ ${note.title}: ${error.message}`);
      continue;
    }

    for (const mention of note.mentions) {
      if (!mention.id) continue;
      const { error: linkError } = await supabase.from("entity_links").insert({
        workspace_id: workspaceId,
        source_type: "note",
        source_id: data.id,
        target_type: mention.type,
        target_id: mention.id,
        relation_type: "mention",
        source: "system",
        confidence: 100,
      });
      if (linkError) {
        console.error(`  ✗ ${note.title} mention link: ${linkError.message}`);
      }
    }

    console.log(`  ✓ ${note.title} (${note.mentions.filter((m) => m.id).length} mentions)`);
  }

  // Cross-links the FK projections don't produce — these add the "everything
  // connects to everything" texture around the hub.
  const relatedLinks: {
    sourceType: "person" | "work";
    sourceId: string | undefined;
    targetType: "person" | "work";
    targetId: string | undefined;
    because: string;
  }[] = [
    { sourceType: "person", sourceId: personIds.get("Sarah Chen"), targetType: "person", targetId: personIds.get("David Liu"), because: "Introduced at SaaS Growth Summit" },
    { sourceType: "person", sourceId: personIds.get("Sarah Chen"), targetType: "person", targetId: personIds.get("Amanda Foster"), because: "Peer founders circle" },
    { sourceType: "work", sourceId: workIdsByName.get("Brand Refresh Q3"), targetType: "work", targetId: workIdsByName.get("Holiday Campaign 2026"), because: "Refresh assets feed the holiday creative" },
    { sourceType: "work", sourceId: workIdsByName.get("Influencer Program"), targetType: "work", targetId: workIdsByName.get("Holiday Campaign 2026"), because: "Creators will seed the holiday launch" },
    { sourceType: "person", sourceId: personIds.get("Priya Nair"), targetType: "work", targetId: workIdsByName.get("Influencer Program"), because: "Runs the creator program day-to-day" },
    { sourceType: "person", sourceId: personIds.get("Tom Bradley"), targetType: "work", targetId: workIdsByName.get("Spring Lookbook"), because: "Directed photography" },
    { sourceType: "person", sourceId: personIds.get("Marcus Williams"), targetType: "work", targetId: workIdsByName.get("Brand Refresh Q3"), because: "Brand-side approver" },
  ];

  for (const link of relatedLinks) {
    if (!link.sourceId || !link.targetId) continue;
    const { error } = await supabase.from("entity_links").insert({
      workspace_id: workspaceId,
      source_type: link.sourceType,
      source_id: link.sourceId,
      target_type: link.targetType,
      target_id: link.targetId,
      relation_type: "related",
      source: "manual",
      confidence: 100,
      because: link.because,
    });
    if (error) {
      console.error(`  ✗ related link: ${error.message}`);
    }
  }
  console.log(`  ✓ ${relatedLinks.filter((l) => l.sourceId && l.targetId).length} related cross-links`);
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
    const personIdsByName = new Map(
      DEMO_ORGS.flatMap((o) => o.contacts.map((c) => [c.name, personIds.get(c.email)] as const))
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    );
    await seedWork(workspaceId, orgIds, personIds);
    await seedMeetings(workspaceId, orgIds, personIds);
    await seedPlays(workspaceId, orgIds);
    await seedBilling(workspaceId, orgIds);
    await seedProposals(workspaceId);
    await seedOpportunityGaps(workspaceId);
    await seedCaptures(workspaceId, orgIds, personIds);
    await seedFindings(workspaceId, orgIds, personIdsByName);
    await seedConnections(workspaceId);
    await seedNotes(workspaceId, userId, orgIds, personIds);

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
