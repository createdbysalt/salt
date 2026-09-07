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
import Stripe from "stripe";
import { buildPlayRunMetadata } from "../app/_features/plays/lib/play-presentation";
import type { PlayPresentation } from "../app/_features/plays/types";

/**
 * Assemble play_runs.metadata through the shared executor → UI contract
 * builder (single source of truth). Demo rows keep their curated copy; the
 * persistence shape can never drift from what real runs produce.
 */
function demoPlayMetadata(play: {
  playbookName: string;
  section: string;
  outputType: PlayPresentation["outputType"];
  headline: string;
  evidence: { label: string; url?: string; appLabel?: string; appId?: string }[];
  artifacts?: { appId: string; label: string; url?: string }[];
}): Record<string, unknown> {
  const connectorIds = [
    ...new Set(
      [...play.evidence, ...play.artifacts ?? []]
        .map((item) => item.appId)
        .filter((id): id is string => Boolean(id) && id !== "salt")
    ),
  ].slice(0, 3);

  return buildPlayRunMetadata({
    section: play.section,
    layer: "act",
    outputType: play.outputType,
    playbookName: play.playbookName,
    headline: play.headline,
    evidence: play.evidence,
    artifacts: play.artifacts ?? [],
    connectorIds,
    draftBody: null,
    recipientLabel: null,
    channel: null,
  });
}

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

// Real, openable links for demo evidence + artifacts. Stripe URLs are created
// live by seedStripeArtifacts() and swapped in via {{stripe:*}} tokens; the
// rest are search URLs that always open the real app (no dead demo links).
const gmailSearch = (query: string) =>
  `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
const calendarSearch = (query: string) =>
  `https://calendar.google.com/calendar/u/0/r/search?q=${encodeURIComponent(query)}`;
const driveSearch = (query: string) =>
  `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;
const SLACK_APP_URL = "https://slack.com/app";

const DEMO_PLAYS: DemoPlay[] = [
  {
    title: "$50K deal closing: meeting prep + invoice ready",
    headline: "Catalyst call at 4pm, your proposal and deposit invoice are ready",
    preview: "Salt cross-referenced Calendar, Gmail, and Stripe. Proposal attached, invoice drafted, talking points ready.",
    draftBody: "Subject: Portfolio Brand Services proposal for today's call\n\nHi David,\n\nLooking forward to our call at 4pm! As discussed, I've attached the full Portfolio Brand Services proposal.\n\nQuick summary:\n• $50K/year for up to 5 portfolio companies\n• Dedicated brand strategist for each\n• 48-hour turnaround on urgent requests\n\nI've also included the Meridian Tech case study you asked about. They saw 3x content output in 90 days.\n\nSee you at 4!\n\nBest,",
    recipientLabel: "David Liu",
    channel: "Gmail",
    confidence: 98,
    etaLabel: "Send before 4pm",
    playbookSlug: "meeting-prep",
    playbookName: "Meeting Prep",
    section: "meetings",
    triggerSignal: "Meeting in under 4 hours with an open proposal",
    evidence: [
      { label: "Saw the 4:00 PM Catalyst Ventures follow-up on your calendar", url: calendarSearch("Catalyst Ventures"), appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Read David's last email asking for the portfolio pricing breakdown", url: gmailSearch("from:david@catalystvc.com"), appLabel: "Gmail", appId: "google" },
      { label: "Noticed the $25,000 deposit invoice is still a draft in Stripe", url: "{{stripe:catalyst}}", appLabel: "Stripe", appId: "stripe" },
    ],
    artifacts: [
      { appId: "stripe", label: "INV-2026-056 · $25,000 deposit (draft)", url: "{{stripe:catalyst}}" },
    ],
    targetOrgSlug: "catalyst-ventures",
    sourceUrl: calendarSearch("Catalyst Ventures"),
    triggerLabel: "📅 Calendar + 📧 Gmail + 💳 Stripe",
  },
  {
    title: "Artisan overdue $4,750: Stripe says the card failed",
    headline: "Nina's payment failed 35 days ago, the nudge is drafted",
    preview: "Salt found the failed charge in Stripe, drafted a friendly nudge with updated payment link.",
    draftBody: "Subject: Following up on INV-2026-048 ($4,750)\n\nHi Nina,\n\nHope you're well! Quick heads up: it looks like the payment for INV-2026-048 ($4,750) didn't go through. Stripe flagged a card issue on July 15.\n\nNo worries at all. Here's a fresh payment link:\n{{stripe:artisanPay}}\n\nLet me know if you'd prefer to switch to ACH or update the card on file.\n\nBest,",
    recipientLabel: "Nina Patel",
    channel: "Gmail",
    confidence: 94,
    etaLabel: "35 days overdue",
    playbookSlug: "invoice-reminder",
    playbookName: "Invoice Reminder",
    section: "billing",
    triggerSignal: "Invoice 35 days overdue with a failed charge",
    evidence: [
      { label: "Noticed INV-2026-048 ($4,750) is 35 days past due in Stripe", url: "{{stripe:artisan}}", appLabel: "Stripe", appId: "stripe" },
      { label: "Saw the card decline Stripe logged on July 15", url: "{{stripe:artisan}}", appLabel: "Stripe", appId: "stripe" },
      { label: "Checked Gmail, no reply from Nina since the first reminder", url: gmailSearch("from:nina@artisancoffee.co"), appLabel: "Gmail", appId: "google" },
    ],
    targetOrgSlug: "artisan-coffee",
    sourceUrl: "{{stripe:artisan}}",
    triggerLabel: "💳 Stripe failed charge + 📧 Gmail",
  },
  {
    title: "Sarah's contract renews in 30 days: upsell ready",
    headline: "Evergreen renews Sept 30, the renewal + holiday upsell is drafted",
    preview: "Salt analyzed 6 months of Slack convos + invoices. She mentioned expansion 4x. Renewal + upsell proposal drafted.",
    draftBody: "Subject: Evergreen renewal + a holiday campaign proposal\n\nHi Sarah,\n\nCan you believe we're coming up on 6 months already? The Evergreen partnership has been incredible. 3 successful campaigns, 47% engagement lift, and that viral TikTok moment.\n\nYour current contract ($24K) renews Sept 30. Given the Holiday Campaign scope, I'd love to propose:\n\n• Renewed retainer: $28K (+$4K for expanded social)\n• Add-on: $45K Holiday Campaign (Oct-Dec)\n• Total partnership: $73K/year\n\nI've attached a detailed breakdown. Coffee this week to discuss?\n\nBest,",
    recipientLabel: "Sarah Chen",
    channel: "Gmail",
    confidence: 96,
    etaLabel: "Renews in 30 days",
    playbookSlug: "contract-renewal-alert",
    playbookName: "Contract Renewal Alert",
    section: "billing",
    triggerSignal: "Recurring contract hits its 30-day renewal window",
    evidence: [
      { label: "Found the Brand Refresh contract renewing Sept 30 ($24K)", url: "{{stripe:evergreen}}", appLabel: "Stripe", appId: "stripe" },
      { label: "Counted 4 expansion mentions from Sarah in #evergreen-salt this month", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
      { label: "Saw the Holiday Campaign draft invoice ($45K) waiting in Stripe", url: "{{stripe:evergreen}}", appLabel: "Stripe", appId: "stripe" },
    ],
    targetOrgSlug: "evergreen-brands",
    sourceUrl: SLACK_APP_URL,
    triggerLabel: "💬 Slack mentions + 💳 Stripe history + 📅 Contract date",
  },
  {
    title: "Amanda mentioned video 4x: $15K upsell opportunity",
    headline: "Amanda asked about video again, the $15K proposal is drafted",
    preview: "Salt analyzed Slack history + meeting notes. She's ready. Proposal + calendar invite drafted.",
    draftBody: "Subject: Video at Luna: a proposal\n\nHi Amanda,\n\nI've been thinking about our last few conversations. You mentioned video 4 times in the past month, and I think you're absolutely right that it's time.\n\nLuna's national expansion deserves to be documented. I put together a video package:\n\n• $2,500/month for 6 months ($15K total)\n• 4 short-form + 1 long-form monthly\n• First video: Your founder story\n\nI blocked Thursday 2pm for us to discuss (calendar invite attached). Let me know if another time works better.\n\nBest,",
    recipientLabel: "Amanda Foster",
    channel: "Gmail",
    confidence: 92,
    etaLabel: "Hot lead",
    playbookSlug: "upsell-opportunity",
    playbookName: "Upsell Opportunity",
    section: "relationships",
    triggerSignal: "Client mentioned an unpurchased service 4 times in 30 days",
    evidence: [
      { label: "Counted 4 video mentions from Amanda in Slack this month", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
      { label: "Re-read the July retro notes, national expansion is the priority", url: calendarSearch("Luna Wellness"), appLabel: "Google Calendar", appId: "google-calendar" },
      { label: "Confirmed no video line item on any Luna invoice in Stripe", url: "{{stripe:luna}}", appLabel: "Stripe", appId: "stripe" },
    ],
    targetOrgSlug: "luna-wellness",
    sourceUrl: SLACK_APP_URL,
    triggerLabel: "💬 Slack (4 mentions) + 📅 Calendar + 📧 Gmail",
  },
  {
    title: "September spend pacing 22% over: cap note drafted",
    headline: "Contractor hours and two early renewals are pacing $1,840 over September budget",
    preview: "QuickBooks Overwatch watches your monthly spend tendencies. Contractor invoices are pacing 31% over and two annual tool renewals landed early. A note capping September hours is drafted.",
    draftBody: "Subject: September hours: let's cap at 60\n\nHi Dana,\n\nQuick heads up as we plan the rest of September. Your invoices are pacing about 31% above a typical month (72 hours logged, 10 days to go), so let's cap September at 60 hours total.\n\nIf anything is mid-flight that needs more time, flag it and I'll shift budget from the October retainer instead.\n\nThanks for being flexible.\n\nBest,",
    recipientLabel: "Dana Kim (contractor)",
    channel: "Gmail",
    confidence: 91,
    etaLabel: "10 days left in month",
    playbookSlug: "spend-overwatch",
    playbookName: "QuickBooks Overwatch",
    section: "billing",
    triggerSignal: "Monthly spend pacing more than 15% over budget with 10+ days left",
    evidence: [
      { label: "Read September contractor invoices in QuickBooks: 72 hours logged, pacing 31% over", url: "https://app.qbo.intuit.com/", appLabel: "QuickBooks", appId: "quickbooks" },
      { label: "Spotted Figma and Adobe annual renewals landing 3 weeks early ($640)", url: "https://app.qbo.intuit.com/", appLabel: "QuickBooks", appId: "quickbooks" },
      { label: "Compared against your 6-month spend average ($8,400/month)", url: "https://app.qbo.intuit.com/", appLabel: "QuickBooks", appId: "quickbooks" },
    ],
    sourceUrl: "https://app.qbo.intuit.com/",
    triggerLabel: "📒 QuickBooks spend tendency + 📅 Days left in month",
  },
  {
    title: "3 warm leads surfaced: Priya's follow-up is drafted",
    headline: "Priya opened your rate card twice since Salt's reply, the intro pre-read is ready",
    preview: "Lead Scout watches referrals, repeat inquiries, and buying language. Northwind, Helios, and a founder Sarah intro'd all surfaced this week. Priya is the hottest: Salt replied within the hour yesterday, and the pre-read for Wednesday's intro is drafted.",
    draftBody: "Subject: Ahead of Wednesday: how a Series B rebrand runs\n\nHi Priya,\n\nLooking forward to Wednesday. Since timing matters ahead of your announcement, here's how we typically run it:\n\n• Weeks 1-2: positioning sprint with your founding team\n• Weeks 3-5: identity and messaging, weekly reviews\n• Week 6: launch kit, ready for the announcement\n\nEvergreen went through the same arc last year and saw a 47% engagement lift in the first quarter after launch.\n\nBring your deck if you can. It helps me see how you're telling the story today.\n\nBest,",
    recipientLabel: "Priya Nair",
    channel: "Gmail",
    confidence: 89,
    etaLabel: "Intro call Wednesday",
    playbookSlug: "lead-scout",
    playbookName: "Lead Scout",
    section: "relationships",
    triggerSignal: "Replied lead re-opened the rate card thread 2x within 48 hours",
    evidence: [
      { label: "Read Sarah's intro email connecting you with Priya on Tuesday", url: gmailSearch("Northwind"), appLabel: "Gmail", appId: "google" },
      { label: "Noticed Priya opened your rate card thread twice since Salt's reply yesterday", url: gmailSearch("from:priya@northwindstudio.com"), appLabel: "Gmail", appId: "google" },
      { label: "Cross-checked capacity: 1 client slot opens Sept 15 in your calendar", url: calendarSearch("client kickoff"), appLabel: "Google Calendar", appId: "google-calendar" },
    ],
    sourceUrl: gmailSearch("Northwind"),
    triggerLabel: "📧 Referral + repeat opens + 📅 Capacity check",
  },
  {
    title: "Founder-story post hit 18K views: follow-up scripted",
    headline: "Your TikTok doubled its usual views, the follow-up script is ready to record",
    preview: "Social Watch read engagement on your last 5 posts. Founder-story content is outperforming 4:1. A 60-second follow-up script and shot list are ready, you just record.",
    draftBody: "Subject: Founder-story follow-up: 60-second script + shot list\n\nHOOK (0-3s): \"I almost turned down my biggest client because my contract didn't protect me.\"\n\nBEAT 1 (3-20s): The moment: the invoice sat 35 days and I had no follow-up system.\n\nBEAT 2 (20-45s): The fix: what I changed in my onboarding so it never happens again.\n\nCLOSE (45-60s): \"Comment CHECKLIST and I'll send you the exact template.\"\n\nShot list: desk talking head, screen recording of the checklist, close-up on the signed contract.\n\nBest posting window: Tuesday 6-8pm (your audience peak).",
    recipientLabel: "Content queue",
    channel: "Note",
    confidence: 87,
    etaLabel: "Post within 48h",
    playbookSlug: "social-content-engine",
    playbookName: "Social Content Engine",
    section: "work",
    triggerSignal: "Post engagement 2x baseline, follow-up window is 48 hours",
    evidence: [
      { label: "Read the engagement on your last 5 TikTok posts: founder story at 18.2K views, 4x your baseline", url: "https://www.tiktok.com/", appLabel: "TikTok", appId: "tiktok" },
      { label: "Found 214 comments, \"checklist\" requested 38 times", url: "https://www.tiktok.com/", appLabel: "TikTok", appId: "tiktok" },
      { label: "Checked your Instagram: the cross-post is your top Reel this month", url: "https://www.instagram.com/", appLabel: "Instagram", appId: "instagram" },
    ],
    artifacts: [
      { appId: "google-drive", label: "Founder-story follow-up script (Doc)", url: driveSearch("Founder story follow-up script") },
    ],
    sourceUrl: "https://www.tiktok.com/",
    triggerLabel: "🎵 TikTok engagement + 📸 Instagram + 📅 Posting window",
  },
  {
    title: "Clients asked about scope 9x this month: post drafted",
    headline: "Scope creep is your clients' #1 question, Salt drafted the post that answers it",
    preview: "Salt analyzed 6.5 hours of client threads this month. \"How do scope changes work?\" came up 9 times across 4 clients. A LinkedIn post built from your real project data is ready to publish.",
    draftBody: "Subject: LinkedIn post: \"The scope question every client asks\"\n\nEvery client asks me the same question in month one: \"What happens when the scope changes?\"\n\nHere is my actual answer, from real projects:\n\n1. Small tweaks (under 2 hours) are always free. Goodwill compounds.\n2. Anything bigger gets a written change order within 24 hours, with a price, before work starts.\n3. My clients see the same tracker I do, so nothing is a surprise.\n\nSince I started doing this, scope conversations take 10 minutes instead of 10 emails.\n\nThe lesson: clients don't fear scope changes. They fear surprise invoices.\n\n#clientwork #freelance #branddesign",
    recipientLabel: "LinkedIn",
    channel: "Note",
    confidence: 90,
    etaLabel: "Publish this week",
    playbookSlug: "client-intel-content",
    playbookName: "Client Intel Content",
    section: "work",
    triggerSignal: "Same client question repeats 5+ times across threads in 30 days",
    evidence: [
      { label: "Analyzed 6.5 hours of client email threads this month", url: gmailSearch("scope"), appLabel: "Gmail", appId: "google" },
      { label: "Counted 9 scope-change questions across Artisan, Evergreen, Luna, and Vertex", url: gmailSearch("scope change"), appLabel: "Gmail", appId: "google" },
      { label: "Pulled your real change-order numbers from the Vertex and Meridian projects", url: driveSearch("change order"), appLabel: "Google Drive", appId: "google-drive" },
    ],
    artifacts: [
      { appId: "google-drive", label: "Scope post: draft + data appendix (Doc)", url: driveSearch("scope post draft") },
    ],
    sourceUrl: gmailSearch("scope"),
    triggerLabel: "📧 Thread analysis (6.5h) + 📁 Project data",
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
    claim: "$50K deal going cold: follow up today",
    summary: "Catalyst Ventures hasn't responded in 12 days. You have a meeting at 4pm. Don't miss it.",
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
  findingType: "revenue_closing" | "revenue_risk" | "revenue_upsell" | "revenue_buying" | "pending_deliverable" | "pending_reply";
  title: string;
  content: string;
  confidence: number;
  orgSlug?: string;
  personName?: string;
  /** Findings are proactive: each one names the play Salt already ran or queued. */
  triggeredPlay?: { slug: string; playTitle: string; status: "queued" | "sent" };
  evidence?: {
    source_type: "email" | "stripe" | "calendar";
    quotes?: string[];
    metadata?: Record<string, unknown>;
  };
}

const DEMO_FINDINGS: DemoFinding[] = [
  {
    findingType: "revenue_risk",
    title: "Catalyst deal going cold",
    content: "No response from David in 12 days, so Salt prepped today's 4pm call around re-opening the $50K proposal. The meeting brief, talking points, and $25K deposit invoice are queued for your approval.",
    confidence: 78,
    orgSlug: "catalyst-ventures",
    personName: "David Liu",
    triggeredPlay: { slug: "meeting-prep", playTitle: "$50K deal closing: meeting prep + invoice ready", status: "queued" },
    evidence: {
      source_type: "email",
      quotes: ["Let me check with the partners and circle back next week."],
      metadata: {
        because: "David's last reply was 12 days ago, right after the $50K proposal landed. Today's 4pm call is the natural moment to re-open it.",
        why_it_matters: "Deals that go quiet for 10+ days after a proposal close at half the usual rate. The 4pm call today is the cheapest moment to re-open it, so Salt prepared everything before you walk in.",
        whyItMatters: "Deals that go quiet for 10+ days after a proposal close at half the usual rate. The 4pm call today is the cheapest moment to re-open it, so Salt prepared everything before you walk in.",
        recommended_action: "Approve the Catalyst meeting prep play in your queue.",
        from_email: "david@catalystvc.com",
        from_name: "David Liu",
      },
    },
  },
  {
    findingType: "pending_reply",
    title: "Artisan Coffee invoice inquiry",
    content: "Nina asked about payment terms yesterday. Salt answered the underlying issue instead of just flagging it: a friendly reminder with a fresh payment link is drafted and waiting in your queue.",
    confidence: 85,
    orgSlug: "artisan-coffee",
    personName: "Nina Patel",
    triggeredPlay: { slug: "invoice-reminder", playTitle: "Artisan overdue $4,750: Stripe says the card failed", status: "queued" },
    evidence: {
      source_type: "email",
      quotes: ["Can we discuss the payment terms on the latest invoice? Happy to hop on a quick call."],
      metadata: {
        because: "Nina asked about payment terms yesterday and the thread is waiting on you. She usually replies within hours.",
        why_it_matters: "INV-2026-048 is $4,750 and 35 days overdue because the card failed. Nina asking about terms is a buying signal for a solution, not a complaint. A reply with a working payment link closes it today.",
        whyItMatters: "INV-2026-048 is $4,750 and 35 days overdue because the card failed. Nina asking about terms is a buying signal for a solution, not a complaint. A reply with a working payment link closes it today.",
        recommended_action: "Approve the Artisan invoice reminder play in your queue.",
        from_email: "nina@artisancoffee.co",
        from_name: "Nina Patel",
      },
    },
  },
  {
    findingType: "revenue_buying",
    title: "Studio Collective asked about pricing",
    content: "Alex asked what a strategy sprint costs and mentioned approved Q4 budget. Salt already replied with two intro slots and held 30 minutes on your calendar tomorrow.",
    confidence: 88,
    orgSlug: "studio-collective",
    personName: "Alex Rivera",
    triggeredPlay: { slug: "lead-follow-up", playTitle: "Re: Strategy sprint inquiry (reply sent, intro held)", status: "sent" },
    evidence: {
      source_type: "email",
      quotes: ["What would a two-week strategy sprint cost? We have budget approved for Q4."],
      metadata: {
        because: "Alex asked for pricing directly and mentioned approved budget. That is buying intent, not a casual inquiry.",
        why_it_matters: "Leads with approved budget go cold in days. Salt replied within the hour with Thursday 3pm or Friday 10am, and held the time so the thread never went quiet.",
        whyItMatters: "Leads with approved budget go cold in days. Salt replied within the hour with Thursday 3pm or Friday 10am, and held the time so the thread never went quiet.",
        recommended_action: "Nothing needed. The reply is sent and the intro slot is held.",
        from_email: "alex@studiocollective.design",
        from_name: "Alex Rivera",
      },
    },
  },
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

async function clearDemoData(workspaceId: string): Promise<Map<string, { id: string; slug: string | null }>> {
  console.log(`\nClearing existing demo data...`);

  // Order matters - delete in reverse dependency order
  await supabase.from("capture_routing_decisions").delete().eq("workspace_id", workspaceId);
  await supabase.from("capture_events").delete().eq("workspace_id", workspaceId);
  await supabase.from("entity_evidence").delete().eq("workspace_id", workspaceId);
  await supabase.from("salt_learnings").delete().eq("workspace_id", workspaceId);
  await supabase.from("memory_customize_entries").delete().eq("workspace_id", workspaceId);
  await supabase.from("intelligence_findings").delete().eq("workspace_id", workspaceId);
  await supabase.from("activity_entries").delete().eq("workspace_id", workspaceId);
  await supabase.from("proposals").delete().eq("workspace_id", workspaceId);
  await supabase.from("billing_records").delete().eq("workspace_id", workspaceId);
  // play_runs referenced by usage_events can't be deleted: the ledger is
  // append-only and the FK is ON DELETE SET NULL, so the delete trips the
  // usage_events_immutable trigger. Delete unmetered runs and hand the
  // survivors to seedPlays, which updates them in place.
  const { data: meteredRefs } = await supabase
    .from("usage_events")
    .select("play_run_id")
    .eq("workspace_id", workspaceId)
    .not("play_run_id", "is", null);
  const meteredIds = [...new Set((meteredRefs ?? []).map((r) => r.play_run_id as string))];

  let playRunsDelete = supabase.from("play_runs").delete().eq("workspace_id", workspaceId);
  if (meteredIds.length > 0) {
    playRunsDelete = playRunsDelete.not("id", "in", `(${meteredIds.join(",")})`);
  }
  const { error: playRunsError } = await playRunsDelete;
  if (playRunsError) console.warn(`  ⚠ play_runs cleanup failed: ${playRunsError.message}`);

  const meteredSurvivors = new Map<string, { id: string; slug: string | null }>();
  if (meteredIds.length > 0) {
    const { data: surviving } = await supabase
      .from("play_runs")
      .select("id, title, source_context")
      .eq("workspace_id", workspaceId)
      .in("id", meteredIds);
    for (const row of surviving ?? []) {
      const slug = (row.source_context as { playbook_slug?: string } | null)?.playbook_slug ?? null;
      meteredSurvivors.set(row.title, { id: row.id, slug });
    }
    if (meteredSurvivors.size > 0) {
      console.log(`  ⚠ kept ${meteredSurvivors.size} metered play_runs (append-only ledger) — will update in place`);
    }
  }
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
  return meteredSurvivors;
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

// ============================================================================
// STRIPE ARTIFACTS (real test-mode invoices + payment link)
// ============================================================================
//
// Demo evidence and artifacts link to REAL Stripe objects so every "Open in
// Stripe" click lands on a live dashboard page, and the payment link inside
// the Artisan reminder email is a real, payable test-mode link. URLs are
// swapped into play/resource content via {{stripe:*}} tokens at insert time.
// Falls back to plain dashboard URLs when no key is configured so the seeder
// still works without Stripe access.

const STRIPE_TOKEN_FALLBACKS: Record<string, string> = {
  "stripe:home": "https://dashboard.stripe.com/test",
  "stripe:artisan": "https://dashboard.stripe.com/test/invoices",
  "stripe:artisanHosted": "https://dashboard.stripe.com/test/invoices",
  "stripe:artisanPay": "https://dashboard.stripe.com/test/payment-links",
  "stripe:catalyst": "https://dashboard.stripe.com/test/invoices",
  "stripe:luna": "https://dashboard.stripe.com/test/invoices",
  "stripe:lunaHosted": "https://dashboard.stripe.com/test/invoices",
  "stripe:evergreen": "https://dashboard.stripe.com/test/invoices",
  "stripe:evergreenHosted": "https://dashboard.stripe.com/test/invoices",
  "stripe:horizon": "https://dashboard.stripe.com/test/invoices",
  "stripe:horizonHosted": "https://dashboard.stripe.com/test/invoices",
};

/** Swap {{token}} placeholders inside seeded content for real URLs. */
function resolveArtifactUrls<T>(value: T, urls: Record<string, string>): T {
  let json = JSON.stringify(value);
  for (const [token, url] of Object.entries(urls)) {
    json = json.split(`{{${token}}}`).join(url);
  }
  return JSON.parse(json) as T;
}

async function seedStripeArtifacts(): Promise<Record<string, string>> {
  const urls = { ...STRIPE_TOKEN_FALLBACKS };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.log("\nStripe: no STRIPE_SECRET_KEY, using dashboard fallback links");
    return urls;
  }

  console.log("\nCreating real Stripe test-mode artifacts...");
  const stripe = new Stripe(key);
  const dash = `https://dashboard.stripe.com${key.startsWith("sk_test") ? "/test" : ""}`;
  urls["stripe:home"] = dash;

  try {
    // Clean up prior demo runs: delete drafts, void open invoices, deactivate
    // old payment links. Paid invoices stay (they are the billing history).
    const priorInvoices = await stripe.invoices.list({ limit: 100 });
    for (const invoice of priorInvoices.data) {
      if (invoice.metadata?.salt_demo !== "true") continue;
      try {
        if (invoice.status === "draft") await stripe.invoices.del(invoice.id);
        else if (invoice.status === "open") await stripe.invoices.voidInvoice(invoice.id);
      } catch (cleanupError) {
        console.warn(`  ⚠ could not clean invoice ${invoice.id}: ${(cleanupError as Error).message}`);
      }
    }
    const priorLinks = await stripe.paymentLinks.list({ limit: 100 });
    for (const link of priorLinks.data) {
      if (link.metadata?.salt_demo !== "true" || !link.active) continue;
      await stripe.paymentLinks.update(link.id, { active: false });
    }

    // Customers (reused across reseeds by email)
    const customerFor = async (email: string, name: string): Promise<string> => {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) return existing.data[0].id;
      const created = await stripe.customers.create({
        email,
        name,
        metadata: { salt_demo: "true" },
      });
      return created.id;
    };

    const [artisan, catalyst, luna, evergreen, horizon] = await Promise.all([
      customerFor("nina@artisancoffee.co", "Artisan Coffee Co"),
      customerFor("david@catalystvc.com", "Catalyst Ventures"),
      customerFor("amanda@lunawellness.com", "Luna Wellness"),
      customerFor("sarah@evergreenbrands.co", "Evergreen Brands"),
      customerFor("chris@horizonfitness.com", "Horizon Fitness"),
    ]);

    const addLineItem = (customer: string, invoiceId: string, amountCents: number, description: string) =>
      stripe.invoiceItems.create({
        customer,
        invoice: invoiceId,
        amount: amountCents,
        currency: "usd",
        description,
      });

    // Artisan: open invoice (the "overdue" one in the demo narrative)
    const artisanInvoice = await stripe.invoices.create({
      customer: artisan,
      collection_method: "send_invoice",
      days_until_due: 7,
      auto_advance: true,
      metadata: { salt_demo: "true", demo_number: "INV-2026-048" },
    });
    await addLineItem(artisan, artisanInvoice.id, 475000, "Summer brand campaign: final balance (INV-2026-048)");
    const artisanFinal = await stripe.invoices.finalizeInvoice(artisanInvoice.id);
    urls["stripe:artisan"] = `${dash}/invoices/${artisanFinal.id}`;
    if (artisanFinal.hosted_invoice_url) urls["stripe:artisanHosted"] = artisanFinal.hosted_invoice_url;

    // Artisan payment link: the real URL embedded in the reminder email
    const artisanPrice = await stripe.prices.create({
      unit_amount: 475000,
      currency: "usd",
      product_data: { name: "Summer brand campaign: final balance (INV-2026-048)" },
    });
    const artisanPayLink = await stripe.paymentLinks.create({
      line_items: [{ price: artisanPrice.id, quantity: 1 }],
      metadata: { salt_demo: "true" },
    });
    urls["stripe:artisanPay"] = artisanPayLink.url;

    // Catalyst: draft deposit invoice (matches the "still a draft" narrative)
    const catalystInvoice = await stripe.invoices.create({
      customer: catalyst,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: false,
      metadata: { salt_demo: "true", demo_number: "INV-2026-056" },
    });
    await addLineItem(catalyst, catalystInvoice.id, 2500000, "Portfolio Brand Services: 50% deposit (INV-2026-056)");
    urls["stripe:catalyst"] = `${dash}/invoices/${catalystInvoice.id}`;

    // Luna: finalized + paid out of band (billing history)
    const lunaInvoice = await stripe.invoices.create({
      customer: luna,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: true,
      metadata: { salt_demo: "true", demo_number: "INV-2026-057" },
    });
    await addLineItem(luna, lunaInvoice.id, 650000, "August retainer (INV-2026-057)");
    const lunaFinal = await stripe.invoices.finalizeInvoice(lunaInvoice.id);
    await stripe.invoices.pay(lunaFinal.id, { paid_out_of_band: true });
    urls["stripe:luna"] = `${dash}/invoices/${lunaFinal.id}`;
    if (lunaFinal.hosted_invoice_url) urls["stripe:lunaHosted"] = lunaFinal.hosted_invoice_url;

    // Evergreen: finalized open invoice (sent, awaiting payment)
    const evergreenInvoice = await stripe.invoices.create({
      customer: evergreen,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: true,
      metadata: { salt_demo: "true", demo_number: "INV-2026-058" },
    });
    await addLineItem(evergreen, evergreenInvoice.id, 1200000, "Brand refresh: July (INV-2026-058)");
    const evergreenFinal = await stripe.invoices.finalizeInvoice(evergreenInvoice.id);
    urls["stripe:evergreen"] = `${dash}/invoices/${evergreenFinal.id}`;
    if (evergreenFinal.hosted_invoice_url) urls["stripe:evergreenHosted"] = evergreenFinal.hosted_invoice_url;

    // Horizon: finalized + paid deposit
    const horizonInvoice = await stripe.invoices.create({
      customer: horizon,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: true,
      metadata: { salt_demo: "true", demo_number: "INV-2026-056" },
    });
    await addLineItem(horizon, horizonInvoice.id, 1100000, "Location Launch Kit deposit (INV-2026-056)");
    const horizonFinal = await stripe.invoices.finalizeInvoice(horizonInvoice.id);
    await stripe.invoices.pay(horizonFinal.id, { paid_out_of_band: true });
    urls["stripe:horizon"] = `${dash}/invoices/${horizonFinal.id}`;
    if (horizonFinal.hosted_invoice_url) urls["stripe:horizonHosted"] = horizonFinal.hosted_invoice_url;

    console.log("  ✓ 5 customers, 5 invoices, 1 payment link (real test-mode objects)");
  } catch (error) {
    console.warn(`  ⚠ Stripe artifact creation failed, using fallback links: ${(error as Error).message}`);
  }

  return urls;
}

async function seedPlays(workspaceId: string, orgIds: Map<string, string>, meteredSurvivors: Map<string, { id: string; slug: string | null }> = new Map(), stripeUrls: Record<string, string> = STRIPE_TOKEN_FALLBACKS) {
  console.log(`\nSeeding plays (${DEMO_PLAYS.length} queued + executed)...`);

  const queuedPlays = resolveArtifactUrls(DEMO_PLAYS, stripeUrls);

  // Queued plays — full v2 attribution so cards and the detail modal render
  // the rich layout (headline, section identity, draft, evidence, artifacts).
  for (const play of queuedPlays) {
    const targetOrgId = play.targetOrgSlug ? orgIds.get(play.targetOrgSlug) : undefined;
    const targetOrg = DEMO_ORGS.find((o) => o.slug === play.targetOrgSlug);

    const row = {
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
      // The pending action behind the card. "Open in Gmail" materializes a
      // real draft in the demo Gmail from this; the recipient is the demo
      // inbox (and the demo-recipient guard rewrites it again at execution),
      // so a live demo never emails a fake client address. Approve stays
      // log-only because paused_for_approval is intentionally false.
      approval_context: {
        tool_slug: "GMAIL_SEND_EMAIL",
        args: { recipient_email: DEMO_EMAIL },
        step_index: 0,
      },
      source_context: {
        source: "playbook",
        playbook_slug: play.playbookSlug,
        trigger_signal: play.triggerSignal,
      },
      metadata: {
        ...demoPlayMetadata({
          playbookName: play.playbookName,
          section: play.section,
          outputType: "email_draft",
          headline: play.headline,
          evidence: play.evidence,
          artifacts: play.artifacts,
        }),
        source_url: play.sourceUrl,
        trigger_label: play.triggerLabel,
      },
    };

    // A metered survivor (usage_events is append-only) can't be deleted —
    // refresh its content in place so reseeds don't duplicate the card.
    // Match by title first, then by playbook slug so a renamed title still
    // finds its survivor instead of leaving a stale card in the queue.
    // A survivor is consumed once matched so two plays sharing a slug never
    // collide on the same row.
    let survivingId: string | undefined;
    let survivingKey: string | undefined;
    const byTitle = meteredSurvivors.get(play.title);
    if (byTitle) {
      survivingId = byTitle.id;
      survivingKey = play.title;
    } else {
      for (const [key, survivor] of meteredSurvivors) {
        if (survivor.slug && survivor.slug === play.playbookSlug) {
          survivingId = survivor.id;
          survivingKey = key;
          break;
        }
      }
    }
    if (survivingId) {
      if (survivingKey) meteredSurvivors.delete(survivingKey);
      const { error } = await supabase.from("play_runs").update(row).eq("id", survivingId);
      if (error) {
        console.error(`  ✗ ${play.title}: ${error.message}`);
      } else {
        console.log(`  ✓ ${play.title} (updated metered run in place)`);
      }
      continue;
    }

    const { error } = await supabase.from("play_runs").insert(row);

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
        { label: "Saw the 4:00 PM Catalyst Ventures follow-up on your calendar", url: calendarSearch("Catalyst Ventures"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Read David's last email asking for the portfolio pricing breakdown", url: gmailSearch("from:david@catalystvc.com"), appLabel: "Gmail", appId: "google" },
        { label: "Noticed the $25,000 deposit invoice is still a draft in Stripe", url: "{{stripe:catalyst}}", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "google", label: "Catalyst meeting brief (Notes)", url: driveSearch("Catalyst meeting brief") }],
    },
    {
      title: "Meeting brief prepped: Meridian Tech 2pm", headline: "Your 2pm Meridian brief is ready", daysAgo: 0, stakes: "high", channel: "Note", recipientLabel: "James Park", preview: "Launch timeline, content status, deliverables checklist for James", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Weekly sync in under 4 hours",
      evidence: [
        { label: "Saw the 2:00 PM Meridian weekly sync on your calendar", url: calendarSearch("Meridian Tech"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Pulled the launch checklist from #meridian-salt in Slack", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
      ],
      artifacts: [{ appId: "google", label: "Meridian launch brief (Notes)", url: driveSearch("Meridian launch brief") }],
    },
    {
      title: "Invoice sent: Luna Wellness August retainer", headline: "Amanda's August retainer invoice went out", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Amanda Foster", preview: "Auto-generated and sent INV-2026-057 for $6,500", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Retainer invoice due on the 1st of the month",
      evidence: [
        { label: "Noticed the August retainer was due and uninvoiced in Stripe", url: "{{stripe:luna}}", appLabel: "Stripe", appId: "stripe" },
        { label: "Matched the $6,500 amount to the signed retainer email", url: gmailSearch("from:amanda@lunawellness.com"), appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-057 · $6,500 (sent)", url: "{{stripe:luna}}" }],
      sentBody: "Subject: INV-2026-057: August retainer\n\nHi Amanda,\n\nYour August retainer invoice is ready: INV-2026-057 for $6,500.\n\nPay securely here: {{stripe:lunaHosted}}\n\nBest,",
    },
    {
      title: "Follow-up sent: Evergreen Q3 check-in", headline: "Sarah got the Q3 check-in", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Brand refresh progress update, seeded holiday campaign discussion", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "No reply in 6 days on an active engagement",
      evidence: [
        { label: "Noticed Sarah hasn't replied since the Phase 2 update 6 days ago", url: gmailSearch("from:sarah@evergreenbrands.co"), appLabel: "Gmail", appId: "google" },
        { label: "Read her Slack reaction to the engagement numbers on Friday", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
      ],
      sentBody: "Subject: Q3 check-in + holiday planning\n\nHi Sarah,\n\nQuick check-in on the brand refresh. Phase 2 wraps Friday and engagement is tracking 47% above baseline.\n\nWith Q4 around the corner, worth sketching the holiday campaign soon. Want me to put together concepts?\n\nBest,",
    },
    {
      title: "Invoice reminder: Artisan Coffee overdue", headline: "Nina got a friendly nudge on INV-2026-048", daysAgo: 30, stakes: "high", channel: "Gmail", recipientLabel: "Nina Patel", preview: "First payment reminder for INV-2026-048 ($4,750), sent 5 days past due", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Invoice 5 days past due",
      evidence: [
        { label: "Noticed INV-2026-048 ($4,750) crossed 5 days past due in Stripe", url: "{{stripe:artisan}}", appLabel: "Stripe", appId: "stripe" },
        { label: "Checked Gmail, no reply from Nina since the invoice went out", url: gmailSearch("from:nina@artisancoffee.co"), appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-048 · $4,750 (overdue)", url: "{{stripe:artisan}}" }],
      sentBody: "Subject: Friendly reminder: INV-2026-048\n\nHi Nina,\n\nFriendly reminder that INV-2026-048 ($4,750) is a few days past due.\n\nHere's the payment link: {{stripe:artisanPay}}\n\nBest,",
    },
    {
      title: "Proposal sent: Catalyst portfolio services", headline: "David has the $50K portfolio proposal", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "David Liu", preview: "Attached $50K proposal ahead of today's meeting", playbookSlug: "upsell-opportunity", playbookName: "Upsell Opportunity", section: "relationships", outputType: "email_draft", triggerSignal: "Meeting today with an open proposal",
      evidence: [
        { label: "Saw the 4:00 PM call with David on your calendar", url: calendarSearch("Catalyst Ventures"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Read his email asking for portfolio pricing before the call", url: gmailSearch("from:david@catalystvc.com"), appLabel: "Gmail", appId: "google" },
      ],
      artifacts: [{ appId: "google", label: "Portfolio Brand Services proposal.pdf", url: driveSearch("Portfolio Brand Services proposal") }],
      sentBody: "Subject: Portfolio Brand Services proposal\n\nHi David,\n\nAhead of our call, the full Portfolio Brand Services proposal is attached.\n\n• $50K/year for up to 5 portfolio companies\n• Dedicated strategist for each\n• 48-hour turnaround on urgent requests\n\nSee you at 4!\n\nBest,",
    },
    {
      title: "Weekly digest: Meridian content pipeline", headline: "Meridian's weekly digest posted to Slack", daysAgo: 0, stakes: "medium", channel: "Slack", recipientLabel: "#meridian-salt", preview: "Shared content status in #meridian-salt channel - 3/5 complete", playbookSlug: "email-digest", playbookName: "Email Digest", section: "communication", outputType: "briefing", triggerSignal: "Weekly digest schedule (Fridays 9am)",
      evidence: [
        { label: "Compiled the week's content status from the Meridian work board", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
        { label: "Cross-checked Elena's latest draft submissions in Gmail", url: gmailSearch("from:elena@meridiantech.io"), appLabel: "Gmail", appId: "google" },
      ],
    },
    {
      title: "Calendar hold: Studio Collective intro", headline: "Held 30 minutes for the Alex Rivera intro", daysAgo: 0, stakes: "medium", channel: "Note", recipientLabel: "Alex Rivera", preview: "Blocked 30min tomorrow for new lead call with Alex Rivera", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "New lead asked for a call",
      evidence: [
        { label: "Read Alex's LinkedIn inquiry asking for an intro call", url: gmailSearch("from:alex@studiocollective.design"), appLabel: "Gmail", appId: "google" },
        { label: "Found a free 30-minute block tomorrow at 3:00 PM", url: calendarSearch("Studio Collective"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
    },
    {
      title: "Status update: Vertex Architecture", headline: "Michael got the Phase 1 status update", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Michael Torres", preview: "Shared website redesign Phase 1 progress - on track", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Weekly status cadence for active work",
      evidence: [
        { label: "Pulled Phase 1 progress from the Vertex work board", url: gmailSearch("from:michael@vertexarch.com"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Website redesign: Phase 1 status\n\nHi Michael,\n\nPhase 1 of the redesign is on track. Wireframes approved, homepage in build.\n\nFull status board: https://drive.google.com/drive/search?q=Vertex%20status%20board\n\nBest,",
    },
    {
      title: "Contract renewal alert: Horizon Fitness", headline: "Chris got the 30-day renewal heads-up", daysAgo: 0, stakes: "high", channel: "Gmail", recipientLabel: "Chris Anderson", preview: "30-day notice sent for $22K Location Launch Kit renewal", playbookSlug: "contract-renewal-alert", playbookName: "Contract Renewal Alert", section: "billing", outputType: "email_draft", triggerSignal: "Contract renews in 30 days",
      evidence: [
        { label: "Noticed the Location Launch Kit agreement renews in 30 days", url: "{{stripe:horizon}}", appLabel: "Stripe", appId: "stripe" },
        { label: "Read Chris's email about the 3 new gym locations", url: gmailSearch("from:chris@horizonfitness.com"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Location Launch Kit renewal: 30 days out\n\nHi Chris,\n\nHeads up that the Location Launch Kit agreement renews in 30 days.\n\nGiven the 3 new locations, I'd love to walk you through the expanded package. Coffee this week?\n\nBest,",
    },
    {
      title: "Meeting notes shared: Luna Wellness", headline: "Luna call notes posted to Slack", daysAgo: 0, stakes: "medium", channel: "Slack", recipientLabel: "#luna-wellness", preview: "Posted last call notes + video upsell talking points", playbookSlug: "meeting-recap", playbookName: "Meeting Recap", section: "meetings", outputType: "notification", triggerSignal: "Meeting ended 30 minutes ago",
      evidence: [
        { label: "Saw the Luna Wellness monthly review ended at 2:30 PM", url: calendarSearch("Luna Wellness"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Formatted the recap for #luna-wellness in Slack", url: SLACK_APP_URL, appLabel: "Slack", appId: "slack" },
      ],
    },
    {
      title: "Lead response: Studio Collective", headline: "Alex got a warm reply with your availability", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Alex Rivera", preview: "Warm response to Alex's LinkedIn inquiry with availability", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Inbound lead inquiry unanswered for 2 days",
      evidence: [
        { label: "Read Alex's inquiry about strategy sprints", url: gmailSearch("from:alex@studiocollective.design"), appLabel: "Gmail", appId: "google" },
        { label: "Checked your calendar for two open intro slots", url: calendarSearch("Studio Collective"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      sentBody: "Subject: Re: Strategy sprint inquiry\n\nHi Alex,\n\nThanks for reaching out! Strategy sprints are exactly what we do.\n\nI have Thursday 3pm or Friday 10am open for an intro call. Either work?\n\nBest,",
    },
    {
      title: "Thank you sent: Evergreen Brands", headline: "Sarah got a thank-you note", daysAgo: 0, stakes: "medium", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Appreciation note to Sarah for Q3 brand refresh partnership", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Milestone completed (Phase 2 sign-off)",
      evidence: [
        { label: "Saw Sarah approve the Phase 2 designs in the refresh thread", url: gmailSearch("from:sarah@evergreenbrands.co"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Thank you for the Q3 refresh\n\nHi Sarah,\n\nJust wanted to say thanks. The Q3 refresh has been a joy to work on and the results speak for themselves.\n\nBest,",
    },
    {
      title: "Project brief created: Horizon Fitness", headline: "Horizon launch brief is in your notes", daysAgo: 0, stakes: "high", channel: "Note", recipientLabel: "Horizon Fitness", preview: "Location launch kit scope, timeline, and deliverables documented", playbookSlug: "daily-briefing", playbookName: "Daily Briefing", section: "me", outputType: "briefing", triggerSignal: "New work item created without a brief",
      evidence: [
        { label: "Read the signed Location Launch Kit scope in Gmail", url: gmailSearch("from:chris@horizonfitness.com"), appLabel: "Gmail", appId: "google" },
        { label: "Pulled the launch dates from your calendar", url: calendarSearch("Horizon Fitness"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      artifacts: [{ appId: "google", label: "Horizon location launch brief (Notes)", url: driveSearch("Horizon location launch brief") }],
    },
    // YESTERDAY - more high-value plays
    {
      title: "Invoice sent: Evergreen monthly", headline: "Sarah got the $12,000 brand refresh invoice", daysAgo: 1, stakes: "high", channel: "Gmail", recipientLabel: "Sarah Chen", preview: "Auto-generated INV-2026-058 for $12,000 brand refresh", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Monthly billing cycle",
      evidence: [
        { label: "Noticed the July brand refresh invoice was due in Stripe", url: "{{stripe:evergreen}}", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-058 · $12,000 (sent)", url: "{{stripe:evergreen}}" }],
      sentBody: "Subject: INV-2026-058: July brand refresh\n\nHi Sarah,\n\nThis month's brand refresh invoice is ready: INV-2026-058 for $12,000.\n\nPay securely here: {{stripe:evergreenHosted}}\n\nBest,",
    },
    {
      title: "Meeting prep: Evergreen Q4 kickoff", headline: "Your Q4 kickoff brief is ready", daysAgo: 1, stakes: "high", channel: "Note", recipientLabel: "Sarah Chen", preview: "Campaign concepts, budget breakdown, timeline for $45K project", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Kickoff scheduled with a draft proposal",
      evidence: [
        { label: "Saw the Q4 campaign kickoff on tomorrow's calendar", url: calendarSearch("Evergreen"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Pulled the $45K holiday campaign proposal scope", url: gmailSearch("from:sarah@evergreenbrands.co"), appLabel: "Gmail", appId: "google" },
      ],
    },
    {
      title: "Follow-up sent: Bloom Creative", headline: "Jessica got a July deliverables check-in", daysAgo: 1, stakes: "medium", channel: "Gmail", recipientLabel: "Jessica Wong", preview: "Photo support retainer check-in for July deliverables", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Deliverables due with no recent reply",
      evidence: [
        { label: "Noticed the July photo deliverables window closing", url: gmailSearch("from:jessica@bloomcreative.co"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: July deliverables check-in\n\nHi Jessica,\n\nChecking in on July photo deliverables. Anything you need from our side?\n\nBest,",
    },
    {
      title: "Calendar hold: Evergreen campaign kickoff", headline: "Blocked 90 minutes for the campaign kickoff", daysAgo: 1, stakes: "low", channel: "Note", recipientLabel: "Sarah Chen", preview: "Blocked 90min tomorrow based on email thread", playbookSlug: "meeting-prep", playbookName: "Meeting Prep", section: "meetings", outputType: "briefing", triggerSignal: "Email thread proposed a kickoff time",
      evidence: [
        { label: "Read Sarah's email proposing a kickoff this week", url: gmailSearch("from:sarah@evergreenbrands.co"), appLabel: "Gmail", appId: "google" },
        { label: "Found a 90-minute opening tomorrow at 10:00 AM", url: calendarSearch("Evergreen"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
    },
    // THIS WEEK
    {
      title: "Proposal follow-up: Vertex Phase 2", headline: "Michael got a gentle nudge on Phase 2", daysAgo: 2, stakes: "high", channel: "Gmail", recipientLabel: "Michael Torres", preview: "Gentle nudge on $9K Phase 2 website expansion", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Proposal viewed but unanswered for 5 days",
      evidence: [
        { label: "Saw Michael open the Phase 2 proposal twice this week", url: gmailSearch("from:michael@vertexarch.com"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Phase 2 proposal: questions?\n\nHi Michael,\n\nCircling back on the Phase 2 proposal ($9K). Happy to answer questions or adjust scope.\n\nBest,",
    },
    {
      title: "Invoice sent: Horizon deposit", headline: "Chris got the $11,000 deposit invoice", daysAgo: 3, stakes: "high", channel: "Gmail", recipientLabel: "Chris Anderson", preview: "Auto-generated INV-2026-056 for $11,000 location kit deposit", playbookSlug: "invoice-reminder", playbookName: "Invoice Reminder", section: "billing", outputType: "email_draft", triggerSignal: "Signed agreement received, deposit due",
      evidence: [
        { label: "Read the signed Location Launch Kit agreement in Gmail", url: gmailSearch("from:chris@horizonfitness.com"), appLabel: "Gmail", appId: "google" },
        { label: "Created the 50% deposit invoice in Stripe", url: "{{stripe:horizon}}", appLabel: "Stripe", appId: "stripe" },
      ],
      artifacts: [{ appId: "stripe", label: "INV-2026-056 · $11,000 (sent)", url: "{{stripe:horizon}}" }],
      sentBody: "Subject: INV-2026-056: Location Launch Kit deposit\n\nHi Chris,\n\nThe Location Launch Kit deposit invoice is ready: INV-2026-056 for $11,000.\n\nPay securely here: {{stripe:horizonHosted}}\n\nBest,",
    },
    {
      title: "Thank you sent: Artisan Coffee", headline: "Nina got a thank-you for the summer campaign", daysAgo: 4, stakes: "medium", channel: "Gmail", recipientLabel: "Nina Patel", preview: "Post-campaign appreciation to Nina for summer collab", playbookSlug: "payment-received", playbookName: "Payment Received", section: "billing", outputType: "email_draft", triggerSignal: "Payment received in Stripe",
      evidence: [
        { label: "Saw Nina's payment clear in Stripe", url: "{{stripe:artisan}}", appLabel: "Stripe", appId: "stripe" },
      ],
      sentBody: "Subject: Payment received, thank you\n\nHi Nina,\n\nPayment received. Thank you! The summer campaign was a pleasure.\n\nBest,",
    },
    {
      title: "Intro scheduled: Studio Collective", headline: "Alex got your booking link", daysAgo: 5, stakes: "medium", channel: "Gmail", recipientLabel: "Alex Rivera", preview: "Auto-replied to Alex's inquiry with Calendly link", playbookSlug: "follow-up", playbookName: "Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Inbound lead inquiry",
      evidence: [
        { label: "Read Alex's LinkedIn inquiry about strategy sprints", url: gmailSearch("from:alex@studiocollective.design"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Re: Strategy sprints\n\nHi Alex,\n\nGreat to hear from you! I have Thursday 3pm or Friday 10am open, or grab any slot on my booking page.\n\nBest,",
    },
    // MORE AUTO-HANDLED - showcases the newer playbooks (cash runway, contract
    // review, recap) plus the payment-received moment.
    {
      title: "Cash runway snapshot ready", headline: "Your Monday cash snapshot is in Notes", daysAgo: 0, stakes: "medium", channel: "Note", recipientLabel: "Salt Demo Studio", preview: "6 open invoices, 1 overdue, runway holding at 4.5 months", playbookSlug: "cash-runway", playbookName: "Cash Runway", section: "billing", outputType: "briefing", triggerSignal: "Weekly cash runway schedule (Mondays 7am)",
      evidence: [
        { label: "Pulled open invoices and balance from Stripe", url: "{{stripe:home}}", appLabel: "Stripe", appId: "stripe" },
        { label: "Checked the next two weeks of calendar for retainer renewals", url: calendarSearch("renewal"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      artifacts: [{ appId: "salt", label: "Cash runway snapshot (Notes)" }],
    },
    {
      title: "Meeting recap sent: Luna monthly review", headline: "Amanda got the recap with action items", daysAgo: 4, stakes: "medium", channel: "Gmail", recipientLabel: "Amanda Foster", preview: "Recap of the monthly review with owners and dates for each action item", playbookSlug: "meeting-recap", playbookName: "Meeting Recap", section: "meetings", outputType: "email_draft", triggerSignal: "Meeting ended 30 minutes ago",
      evidence: [
        { label: "Saw the Luna Wellness monthly review end at 2:30 PM", url: calendarSearch("Luna Wellness"), appLabel: "Google Calendar", appId: "google-calendar" },
        { label: "Matched the action items to Amanda's last email", url: gmailSearch("from:amanda@lunawellness.com"), appLabel: "Gmail", appId: "google" },
      ],
      sentBody: "Subject: Luna review: recap + action items\n\nHi Amanda,\n\nGreat session today. Recap:\n\n• National expansion content starts Sept 15\n• We deliver the launch film outline next Friday\n• You confirm the founder story interview date by Wednesday\n\nFull notes are attached. Talk soon.\n\nBest,",
    },
    {
      title: "Payment recognized: Horizon deposit cleared", headline: "Chris's $11,000 deposit landed, receipt sent", daysAgo: 3, stakes: "medium", channel: "Gmail", recipientLabel: "Chris Anderson", preview: "Deposit cleared in Stripe, thank-you receipt sent automatically", playbookSlug: "payment-received", playbookName: "Payment Received", section: "billing", outputType: "email_draft", triggerSignal: "Invoice paid in Stripe",
      evidence: [
        { label: "Watched INV-2026-056 flip to paid in Stripe", url: "{{stripe:horizon}}", appLabel: "Stripe", appId: "stripe" },
      ],
      sentBody: "Subject: Deposit received: Location Launch Kit\n\nHi Chris,\n\nThe $11,000 deposit for the Location Launch Kit came through. Thank you!\n\nThe kickoff survey goes out tomorrow and we are on for the September start.\n\nBest,",
    },
    {
      title: "Contract reviewed: Helios MSA flagged", headline: "The Helios MSA has 1 critical flag before you sign", daysAgo: 2, stakes: "high", channel: "Note", recipientLabel: "Helios Advisory", preview: "Uncapped indemnity in clause 7, pushback language drafted", playbookSlug: "contract-review", playbookName: "Contract Review", section: "work", outputType: "briefing", triggerSignal: "New contract shared in Drive",
      evidence: [
        { label: "Read the Helios MSA shared in Drive yesterday", url: driveSearch("Helios MSA"), appLabel: "Google Drive", appId: "google-drive" },
        { label: "Cross-checked clause 7 against your standard terms", url: driveSearch("standard terms"), appLabel: "Google Drive", appId: "google-drive" },
      ],
      artifacts: [{ appId: "google-drive", label: "Helios MSA (flagged copy)", url: driveSearch("Helios MSA") }],
    },
    {
      title: "New lead qualified: Northwind Studio", headline: "Priya got a same-day reply with two time slots", daysAgo: 1, stakes: "medium", channel: "Gmail", recipientLabel: "Priya Nair", preview: "Inbound rebrand inquiry answered within the hour while you were in sessions", playbookSlug: "lead-follow-up", playbookName: "Lead Follow-up", section: "relationships", outputType: "email_draft", triggerSignal: "Inbound inquiry with budget signal",
      evidence: [
        { label: "Read Priya's inquiry mentioning a Series B rebrand budget", url: gmailSearch("from:priya@northwindstudio.com"), appLabel: "Gmail", appId: "google" },
        { label: "Found two open intro slots on your calendar", url: calendarSearch("intro call"), appLabel: "Google Calendar", appId: "google-calendar" },
      ],
      sentBody: "Subject: Re: Brand partnership inquiry\n\nHi Priya,\n\nThanks for reaching out. A rebrand ahead of your Series B announcement is exactly the kind of work we do best.\n\nI have Tuesday 1pm or Wednesday 10am open for a 20 minute intro call. Either work?\n\nBest,",
    },
    {
      title: "QuickBooks Overwatch: August closed 4% under budget", headline: "August wrapped $310 under budget, nothing needed", daysAgo: 6, stakes: "low", channel: "Note", recipientLabel: "You", preview: "Monthly spend closed at $8,090 against an $8,400 average. Contractor hours normalized after the July spike.", playbookSlug: "spend-overwatch", playbookName: "QuickBooks Overwatch", section: "billing", outputType: "briefing", triggerSignal: "Month-end spend reconciliation",
      evidence: [
        { label: "Reconciled August spend in QuickBooks: $8,090 against an $8,400 average", url: "https://app.qbo.intuit.com/", appLabel: "QuickBooks", appId: "quickbooks" },
        { label: "Confirmed contractor hours normalized after the July spike", url: "https://app.qbo.intuit.com/", appLabel: "QuickBooks", appId: "quickbooks" },
      ],
    },
    {
      title: "Social Content Engine: Tuesday post recycled to Instagram", headline: "Your top TikTok was reformatted and queued as a Reel", daysAgo: 2, stakes: "low", channel: "Note", recipientLabel: "Content queue", preview: "The founder-story post outperformed 4:1, so Salt prepped the Instagram cut with new captions", playbookSlug: "social-content-engine", playbookName: "Social Content Engine", section: "work", outputType: "briefing", triggerSignal: "Top post ready for cross-posting",
      evidence: [
        { label: "Read the engagement on Tuesday's TikTok: 18.2K views, 4x baseline", url: "https://www.tiktok.com/", appLabel: "TikTok", appId: "tiktok" },
        { label: "Reformatted the cut for Reels and drafted captions in your voice", url: "https://www.instagram.com/", appLabel: "Instagram", appId: "instagram" },
      ],
      artifacts: [{ appId: "google-drive", label: "Reel cut + captions (Doc)", url: driveSearch("Reel cut captions") }],
    },
    {
      title: "Client Intel: response-time insight filed to Memory", headline: "Clients ask about timelines most in week 2, noted for onboarding", daysAgo: 4, stakes: "low", channel: "Note", recipientLabel: "You", preview: "Salt found the pattern across 6 months of threads and filed it to Memory for the onboarding template", playbookSlug: "client-intel-content", playbookName: "Client Intel Content", section: "work", outputType: "briefing", triggerSignal: "Recurring client question pattern detected",
      evidence: [
        { label: "Analyzed 6 months of client threads for repeated questions", url: gmailSearch("timeline"), appLabel: "Gmail", appId: "google" },
        { label: "Filed the week-2 pattern to Memory for the onboarding template", url: driveSearch("onboarding template"), appLabel: "Google Drive", appId: "google-drive" },
      ],
    },
  ];

  const resolvedExecutedPlays = resolveArtifactUrls(executedPlays, stripeUrls);

  for (const play of resolvedExecutedPlays) {
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
        metadata: demoPlayMetadata({
          playbookName: play.playbookName,
          section: play.section,
          outputType: play.outputType,
          headline: play.headline,
          evidence: play.evidence,
          artifacts: play.artifacts,
        }),
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
  console.log(`\nSeeding intelligence findings (${DEMO_FINDINGS.length} auto-handled)...`);

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
      // Findings in the demo are proactive: Salt already ran or queued the
      // play, so the card is FYI ("auto_handled") with the action attached.
      state: "auto_handled",
      triggered_plays: finding.triggeredPlay
        ? [
            {
              slug: finding.triggeredPlay.slug,
              input: {},
              result: {
                play_title: finding.triggeredPlay.playTitle,
                status: finding.triggeredPlay.status,
              },
              executed_at: new Date().toISOString(),
            },
          ]
        : null,
      evidence: finding.evidence ?? null,
    });

    if (error) {
      console.error(`  ✗ ${finding.title}: ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${finding.title} (auto-handled, play attached)`);
  }
}

async function seedConnections(workspaceId: string) {
  console.log(`\nSeeding connections...`);

  const connections = [
    { provider: "gmail", label: "Gmail" },
    { provider: "googlecalendar", label: "Google Calendar" },
    // QuickBooks shows as connected so the Overwatch play reads as real.
    // No composio_connection_id: nothing executes against it in the demo.
    { provider: "quickbooks", label: "QuickBooks" },
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
      content: "# Evergreen holiday campaign ideas\n\nSarah wants three concepts by kickoff:\n\n- 'Evergreen Everwhere': UGC-led, creators unbox the holiday collection\n- 'Rooted': heritage angle, 10-year brand story\n- 'The Gift of Green': sustainability-first, recycled packaging hero\n\nMarcus prefers Rooted. Priya thinks UGC wins on TikTok. Budget conversation happens at kickoff.",
      category: "idea",
      daysAgo: 2,
      mentions: [
        { type: "org", id: evergreenId! },
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "work", id: workIdsByName.get("Holiday Campaign 2026")! },
      ],
    },
    {
      title: "Sarah Chen: working style",
      content: "# Sarah Chen: working style\n\n- Decides fast when given options, hates open-ended questions\n- Prefers Slack over email for anything urgent\n- Champion for us internally, sold the holiday campaign to her CEO\n- Kids' soccer Saturdays, never schedule Monday 8am",
      category: "reference",
      daysAgo: 5,
      mentions: [
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "org", id: evergreenId! },
      ],
    },
    {
      title: "Brand refresh retrospective",
      content: "# Brand refresh retrospective\n\nWhat worked:\n- Engagement +47% after phase 1 launch\n- Tom's photography direction nailed the premium feel\n\nWhat to change for the holiday campaign:\n- Start retail assets 3 weeks earlier (Lisa got burned by print lead times)\n- Loop PR in from day one. Jordan found out about the launch from Instagram",
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
      title: "Meridian launch: lessons",
      content: "# Meridian launch: lessons\n\nJames moves fast and expects us to match. Content engine is working; the Aug 15 launch date is immovable because of their board meeting.",
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
      content: "# David Liu intro\n\nMet David through Sarah Chen at the SaaS Growth Summit. Catalyst's portfolio companies all need brand work. This could be the biggest door we walk through this year.",
      category: "note",
      daysAgo: 15,
      mentions: [
        { type: "person", id: personIds.get("David Liu")! },
        { type: "person", id: personIds.get("Sarah Chen")! },
        { type: "org", id: orgIds.get("catalyst-ventures")! },
      ],
    },
    {
      title: "Studio day: August",
      content: "# Studio day: August\n\nBlocked Friday for admin, invoicing, and portfolio updates. No client calls.",
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
// MEMORY ACTIVITY (Watching + Handled) & CUSTOMIZE
// ============================================================================
//
// Memory → Activity renders from two tables the rest of this script never
// touches: `entity_evidence` (Watching — unresolved, below the trust bar) and
// `salt_learnings` (Handled — applied writes). Without these rows the demo
// workspace looks like Salt has never learned anything. Field-path choices
// matter: they drive the Salt-voiced headlines in learning-story.ts
// ("I think Amanda's service interest is Video production."), and gated
// fields must avoid the always-auto list in field-tiers.ts (phone, company,
// role, email bypass the bar entirely) and the never-touch list (money
// fields, operator legal/tax) which refuse rather than watch.

function daysAgoISO(daysAgo: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
}

interface DemoEvidenceRow {
  fieldPath: string;
  proposedValue: unknown;
  confidence: number;
  evidenceType:
    | "email_match"
    | "name_match"
    | "context_match"
    | "recency"
    | "frequency"
    | "llm_inference"
    | "explicit_mention"
    | "behavioral_signal"
    | "cross_reference";
  excerpt: string;
  sourceType: string;
  playbookSlug: string;
  daysAgo: number;
}

interface DemoWatchingGroup {
  /** Key into the seeded records, resolved to a real entity id below. */
  entityType: "person" | "organization" | "work" | "meeting" | "billing" | "me";
  evidence: DemoEvidenceRow[];
}

async function seedMemoryActivity(
  workspaceId: string,
  userId: string,
  orgIds: Map<string, string>,
  personIds: Map<string, string>,
) {
  console.log(`\nSeeding Memory activity (Watching + Handled)...`);

  // --- Resolve entity ids the narrative references -------------------------
  const { data: workRows } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  const workIdsByName = new Map((workRows ?? []).map((w) => [w.name, w.id]));

  const { data: billingRows } = await supabase
    .from("billing_records")
    .select("id, number")
    .eq("workspace_id", workspaceId);
  const billingIdsByNumber = new Map(
    (billingRows ?? []).map((b) => [b.number, b.id]),
  );

  // A duplicate person record so the merge candidate has a real target —
  // duplicates are what email capture actually produces, and the Watching
  // card ("I think Sarah Chen and Sara Chen might be the same person") is
  // the hygiene story operators love.
  const { data: dupePerson, error: dupeError } = await supabase
    .from("people")
    .insert({
      workspace_id: workspaceId,
      name: "Sara Chen",
      email: "sara.example@gmail.com",
      relationship_type: "client",
      record_status: "active",
      last_contact_at: daysAgoISO(6),
    })
    .select("id")
    .single();
  if (dupeError) {
    console.error(`  ✗ duplicate person (Sara Chen): ${dupeError.message}`);
  }

  // --- Watching: unresolved entity_evidence --------------------------------
  // Raw confidences stay in the 50–75 band so the corroborated aggregate
  // lands under the demo trust bar (80) — everything here is visibly still
  // accumulating, which is the point of the Watching story.
  const watching: {
    entityType: DemoWatchingGroup["entityType"];
    entityId: string | undefined;
    label: string;
    evidence: DemoEvidenceRow[];
  }[] = [
    {
      // Feeds the $15K upsell play — Salt heard it before the owner did.
      entityType: "person",
      entityId: personIds.get("Amanda Foster"),
      label: "Amanda Foster → service interest",
      evidence: [
        { fieldPath: "service_interest", proposedValue: "Video production", confidence: 68, evidenceType: "explicit_mention", excerpt: "Amanda asked about video for the fourth time: \"what would a launch film cost?\"", sourceType: "fireflies", playbookSlug: "memory-records", daysAgo: 2 },
        { fieldPath: "service_interest", proposedValue: "Video production", confidence: 64, evidenceType: "explicit_mention", excerpt: "\"We keep coming back to video. Our audience engages with it 3x more.\"", sourceType: "gmail", playbookSlug: "memory-records", daysAgo: 5 },
        { fieldPath: "service_interest", proposedValue: "Video production", confidence: 58, evidenceType: "behavioral_signal", excerpt: "Monthly retro agenda includes \"video add-on discussion\"", sourceType: "googlecalendar", playbookSlug: "memory-records", daysAgo: 3 },
      ],
    },
    {
      // Cash-story texture: Salt watches payment behavior drift.
      entityType: "organization",
      entityId: orgIds.get("meridian-tech"),
      label: "Meridian Tech → payment pattern",
      evidence: [
        { fieldPath: "payment_pattern", proposedValue: "Net-30 drifting to Net-45", confidence: 66, evidenceType: "behavioral_signal", excerpt: "INV-2026-041 paid 12 days after the due date", sourceType: "stripe", playbookSlug: "memory-records", daysAgo: 3 },
        { fieldPath: "payment_pattern", proposedValue: "Net-30 drifting to Net-45", confidence: 62, evidenceType: "cross_reference", excerpt: "June and July invoices both settled past terms", sourceType: "quickbooks", playbookSlug: "memory-records", daysAgo: 6 },
      ],
    },
    {
      // Renewal radar — pairs with the renewal play in the queue.
      entityType: "organization",
      entityId: orgIds.get("luna-wellness"),
      label: "Luna Wellness → renewal date",
      evidence: [
        { fieldPath: "renewal_date", proposedValue: "2026-10-01", confidence: 71, evidenceType: "explicit_mention", excerpt: "Amanda: \"let's renew the retainer in October, same scope\"", sourceType: "gmail", playbookSlug: "memory-records", daysAgo: 4 },
        { fieldPath: "renewal_date", proposedValue: "2026-10-01", confidence: 60, evidenceType: "context_match", excerpt: "Monthly Retainer has no end date; renewal language in the July retro", sourceType: "googlecalendar", playbookSlug: "memory-records", daysAgo: 4 },
      ],
    },
    {
      // Hygiene: duplicate detection with a real target record.
      entityType: "person",
      entityId: personIds.get("Sarah Chen"),
      label: "Sarah Chen ↔ Sara Chen merge",
      evidence: [
        { fieldPath: "_merge_candidate", proposedValue: { targetId: dupePerson?.id, targetName: "Sara Chen" }, confidence: 72, evidenceType: "email_match", excerpt: "sara.example@gmail.com signed \"Sara\" on the Evergreen holiday thread", sourceType: "gmail", playbookSlug: "memory-hygiene", daysAgo: 2 },
        { fieldPath: "_merge_candidate", proposedValue: { targetId: dupePerson?.id, targetName: "Sara Chen" }, confidence: 66, evidenceType: "name_match", excerpt: "Calendar invite \"Sara Chen (Evergreen)\" matches sarah@evergreenbrands.co", sourceType: "googlecalendar", playbookSlug: "memory-hygiene", daysAgo: 5 },
      ],
    },
    {
      // Connections: the overdue Artisan invoice gets an owner.
      entityType: "billing",
      entityId: billingIdsByNumber.get("INV-2026-048"),
      label: "INV-2026-048 → Nina Patel link",
      evidence: [
        { fieldPath: "_link_candidate", proposedValue: { targetId: personIds.get("Nina Patel"), targetName: "Nina Patel", targetType: "person" }, confidence: 70, evidenceType: "email_match", excerpt: "nina@artisancoffee.co asked about payment terms on this invoice thread", sourceType: "gmail", playbookSlug: "memory-connections", daysAgo: 1 },
        { fieldPath: "_link_candidate", proposedValue: { targetId: personIds.get("Nina Patel"), targetName: "Nina Patel", targetType: "person" }, confidence: 64, evidenceType: "cross_reference", excerpt: "Stripe receipt email matches Nina's address", sourceType: "stripe", playbookSlug: "memory-connections", daysAgo: 2 },
      ],
    },
    {
      // Breadth: enrichment on a brand-new lead.
      entityType: "person",
      entityId: personIds.get("Alex Rivera"),
      label: "Alex Rivera → location",
      evidence: [
        { fieldPath: "location", proposedValue: "Los Angeles", confidence: 61, evidenceType: "llm_inference", excerpt: "LinkedIn profile lists Greater Los Angeles", sourceType: "linkedin", playbookSlug: "memory-records", daysAgo: 1 },
      ],
    },
    {
      // Hygiene: quiet-record archive suggestion (the demo dismissal beat —
      // "may have new project in fall" is why you keep it).
      entityType: "organization",
      entityId: orgIds.get("nexus-labs"),
      label: "Nexus Labs → archive candidate",
      evidence: [
        { fieldPath: "_archive_candidate", proposedValue: { reason: "no_activity" }, confidence: 56, evidenceType: "recency", excerpt: "No email thread activity in 45 days", sourceType: "gmail", playbookSlug: "memory-hygiene", daysAgo: 2 },
        { fieldPath: "_archive_candidate", proposedValue: { reason: "no_activity" }, confidence: 52, evidenceType: "recency", excerpt: "Last meeting was the 2025 launch wrap", sourceType: "googlecalendar", playbookSlug: "memory-hygiene", daysAgo: 2 },
      ],
    },
    {
      // Me scope: Salt learns the operator, not just clients.
      entityType: "me",
      entityId: userId,
      label: "Me → timezone",
      evidence: [
        { fieldPath: "timezone", proposedValue: "America/Los_Angeles", confidence: 72, evidenceType: "context_match", excerpt: "All calendar events are Pacific Time", sourceType: "googlecalendar", playbookSlug: "memory-records", daysAgo: 3 },
        { fieldPath: "timezone", proposedValue: "America/Los_Angeles", confidence: 58, evidenceType: "behavioral_signal", excerpt: "Send times cluster 7am–6pm PT", sourceType: "gmail", playbookSlug: "memory-records", daysAgo: 6 },
      ],
    },
  ];

  let watchingCount = 0;
  for (const group of watching) {
    if (!group.entityId) {
      console.error(`  ✗ ${group.label}: missing entity id, skipped`);
      continue;
    }
    for (const row of group.evidence) {
      const { error } = await supabase.from("entity_evidence").insert({
        workspace_id: workspaceId,
        entity_type: group.entityType,
        entity_id: group.entityId,
        field_path: row.fieldPath,
        proposed_value: row.proposedValue,
        confidence: row.confidence,
        evidence_type: row.evidenceType,
        evidence_details: { excerpt: row.excerpt },
        source_type: row.sourceType,
        playbook_slug: row.playbookSlug,
        ttl_days: null,
        created_at: daysAgoISO(row.daysAgo),
      });
      if (error) {
        console.error(`  ✗ ${group.label}: ${error.message}`);
        break;
      }
      watchingCount++;
    }
    console.log(`  ✓ Watching: ${group.label}`);
  }

  // --- Handled: applied salt_learnings -------------------------------------
  // The audit trail that proves Salt has already been working: record births
  // (field_path "record" → "Added X to People") and field writes ("Set X's
  // title to Y"). Spread across the last two weeks so the feed feels lived-in.
  const handled: {
    entityType: "person" | "organization" | "work" | "meeting" | "billing" | "me";
    entityId: string | undefined;
    entityLabel: string;
    fieldPath: string;
    fieldLabel?: string;
    oldValue?: unknown;
    newValue: unknown;
    confidence: number;
    evidenceSummary: string;
    playbookSlug: string;
    daysAgo: number;
  }[] = [
    { entityType: "person", entityId: personIds.get("Alex Rivera"), entityLabel: "Alex Rivera", fieldPath: "record", newValue: "created", confidence: 88, evidenceSummary: "First seen in a LinkedIn-sourced email; domain matched Studio Collective", playbookSlug: "capture-intake", daysAgo: 2 },
    { entityType: "organization", entityId: orgIds.get("studio-collective"), entityLabel: "Studio Collective", fieldPath: "record", newValue: "created", confidence: 90, evidenceSummary: "Created from the studiocollective.design domain on Alex's first email", playbookSlug: "capture-intake", daysAgo: 2 },
    { entityType: "work", entityId: workIdsByName.get("Retail Launch Kit"), entityLabel: "Retail Launch Kit", fieldPath: "record", newValue: "created", confidence: 84, evidenceSummary: "Statement of work shared in the Evergreen Drive folder", playbookSlug: "capture-intake", daysAgo: 9 },
    { entityType: "person", entityId: personIds.get("Jordan Reyes"), entityLabel: "Jordan Reyes", fieldPath: "record", newValue: "created", confidence: 87, evidenceSummary: "CC'd on the launch PR thread; matched to the Evergreen domain", playbookSlug: "capture-intake", daysAgo: 10 },
    { entityType: "person", entityId: personIds.get("Sarah Chen"), entityLabel: "Sarah Chen", fieldPath: "title", oldValue: "Marketing Director", newValue: "VP Marketing", confidence: 91, evidenceSummary: "Signature block in 4 recent emails", playbookSlug: "memory-records", daysAgo: 3 },
    { entityType: "organization", entityId: orgIds.get("meridian-tech"), entityLabel: "Meridian Tech", fieldPath: "industry", newValue: "B2B SaaS", confidence: 89, evidenceSummary: "Website copy and invoice line items agree", playbookSlug: "memory-records", daysAgo: 6 },
    { entityType: "person", entityId: personIds.get("James Park"), entityLabel: "James Park", fieldPath: "phone", newValue: "+1 650-555-0202", confidence: 93, evidenceSummary: "Calendar invite signature", playbookSlug: "memory-records", daysAgo: 5 },
    { entityType: "person", entityId: personIds.get("Michael Torres"), entityLabel: "Michael Torres", fieldPath: "title", newValue: "Principal Architect", confidence: 92, evidenceSummary: "Email signature and LinkedIn agree", playbookSlug: "memory-records", daysAgo: 8 },
    { entityType: "person", entityId: personIds.get("Amanda Foster"), entityLabel: "Amanda Foster", fieldPath: "relationship_type", oldValue: "prospect", newValue: "client", confidence: 95, evidenceSummary: "Retainer signed and first invoice paid", playbookSlug: "memory-records", daysAgo: 12 },
    { entityType: "organization", entityId: orgIds.get("luna-wellness"), entityLabel: "Luna Wellness", fieldPath: "note", fieldLabel: "Note", newValue: "Renewal conversation lands in October: raise the retainer 20% (see pricing note)", confidence: 86, evidenceSummary: "From your pricing note and the July retro", playbookSlug: "memory-notes", daysAgo: 4 },
    { entityType: "person", entityId: personIds.get("David Liu"), entityLabel: "David Liu", fieldPath: "introduced_by", fieldLabel: "Introduced By", newValue: "Sarah Chen", confidence: 82, evidenceSummary: "Your note from the SaaS Growth Summit", playbookSlug: "memory-connections", daysAgo: 13 },
    { entityType: "person", entityId: personIds.get("Lisa Chen"), entityLabel: "Lisa Chen", fieldPath: "email", oldValue: "lisa.c@horizonfitness.com", newValue: "lisa@horizonfitness.com", confidence: 90, evidenceSummary: "Bounce-back from the old address; new one confirmed in thread", playbookSlug: "memory-hygiene", daysAgo: 7 },
    { entityType: "work", entityId: workIdsByName.get("Brand Refresh Q3"), entityLabel: "Brand Refresh Q3", fieldPath: "summary", newValue: "Visual identity refresh: phase 1 lifted engagement 47%; retail assets feed the holiday campaign", confidence: 85, evidenceSummary: "Synthesized from the retrospective note and 3 linked files", playbookSlug: "memory-work-synthesis", daysAgo: 1 },
  ];

  let handledCount = 0;
  for (const row of handled) {
    if (!row.entityId) {
      console.error(`  ✗ Handled ${row.entityLabel}: missing entity id, skipped`);
      continue;
    }
    const { error } = await supabase.from("salt_learnings").insert({
      workspace_id: workspaceId,
      entity_type: row.entityType,
      entity_id: row.entityId,
      entity_label: row.entityLabel,
      field_path: row.fieldPath,
      field_label: row.fieldLabel ?? null,
      old_value: row.oldValue ?? null,
      new_value: row.newValue,
      confidence: row.confidence,
      evidence_summary: row.evidenceSummary,
      playbook_slug: row.playbookSlug,
      created_at: daysAgoISO(row.daysAgo, 18),
    });
    if (error) {
      console.error(`  ✗ Handled ${row.entityLabel}: ${error.message}`);
      continue;
    }
    handledCount++;
  }
  console.log(`  ✓ ${watchingCount} watching evidence rows, ${handledCount} handled writes`);
}

async function seedMemoryCustomize(workspaceId: string, userId: string) {
  console.log(`\nSeeding Memory Customize...`);

  // Steering entries that visibly cause the Watching items and Plays — the
  // LEARN → ACT → GROW loop made tangible. Scopes use the canonical app
  // vocabulary (general | person | org | work | meeting | resource | billing | me).
  const entries: {
    entityType: "general" | "person" | "org" | "work" | "me" ;
    body: string;
    source: "user" | "ask_salt" | "correction";
    daysAgo: number;
  }[] = [
    { entityType: "general", body: "Flag any invoice over $2,000 that goes more than 7 days past due. Cash flow is everything right now.", source: "user", daysAgo: 9 },
    { entityType: "person", body: "Pay extra attention when clients mention video, launch films, or production. That's the growth service this year.", source: "user", daysAgo: 7 },
    { entityType: "org", body: "Always watch renewal dates on retainer clients and flag them 45 days out.", source: "user", daysAgo: 11 },
    { entityType: "work", body: "Track who introduced each new client. I want to thank referrers personally.", source: "ask_salt", daysAgo: 5 },
    { entityType: "person", body: "Marcus Williams is Brand Director, not Brand Manager.", source: "correction", daysAgo: 3 },
    { entityType: "me", body: "I'm based in Los Angeles. Keep meeting suggestions to Pacific time.", source: "user", daysAgo: 13 },
  ];

  let entryCount = 0;
  for (const entry of entries) {
    const createdAt = daysAgoISO(entry.daysAgo, 8);
    const { error } = await supabase.from("memory_customize_entries").insert({
      workspace_id: workspaceId,
      entity_type: entry.entityType,
      body: entry.body,
      source: entry.source,
      status: "active",
      created_by: userId,
      created_at: createdAt,
      updated_at: createdAt,
    });
    if (error) {
      console.error(`  ✗ customize entry: ${error.message}`);
      continue;
    }
    entryCount++;
  }

  // Trust bar at 80 ("Balanced") — every Watching item sits visibly below it,
  // every Handled write cleared it. Gives the demo a concrete number to point at.
  const { error: thresholdError } = await supabase
    .from("workspaces")
    .update({ memory_care_auto_apply_threshold: 80 })
    .eq("id", workspaceId);
  if (thresholdError) {
    console.error(`  ✗ trust threshold: ${thresholdError.message}`);
  }

  console.log(`  ✓ ${entryCount} customize entries, trust bar set to 80`);
}

// ============================================================================
// RESOURCES
// ============================================================================
//
// Mock files + links for the Resources surface. Every external_url opens a
// REAL destination: Drive search URLs that find the doc in the demo Google
// account, and hosted Stripe invoice pages (public, no login) created by
// seedStripeArtifacts.

interface DemoResource {
  fileName: string;
  category: string;
  externalUrl: string;
  description: string;
  aiSummary: string;
  sourceType: "import" | "email_received" | "upload";
  orgSlug?: string;
  personName?: string;
  workName?: string;
  isOperatorAsset?: boolean;
  daysAgo: number;
}

const DEMO_RESOURCES: DemoResource[] = [
  {
    fileName: "Vertex Website Redesign: Scope v2.pdf",
    category: "reference",
    externalUrl: driveSearch("Vertex Website Redesign Scope v2"),
    description: "Scope, timeline, and photography shot list for the Vertex kickoff.",
    aiSummary: "Full scope for the Vertex website overhaul: 6 week timeline, 3 milestones, shot list for the portfolio photography day.",
    sourceType: "import",
    orgSlug: "vertex-architecture",
    personName: "Michael Torres",
    workName: "Website Redesign",
    daysAgo: 2,
  },
  {
    fileName: "Evergreen Brand Refresh: Proposal.pdf",
    category: "proposal",
    externalUrl: driveSearch("Evergreen Brand Refresh Proposal"),
    description: "The signed-off proposal behind the $24K Brand Refresh Q3 engagement.",
    aiSummary: "Proposal for the Q3 visual identity refresh: deliverables, $24K fee, phased rollout across social, retail, and web.",
    sourceType: "import",
    orgSlug: "evergreen-brands",
    personName: "Sarah Chen",
    workName: "Brand Refresh Q3",
    daysAgo: 64,
  },
  {
    fileName: "Catalyst Portfolio Brand Services: Proposal.pdf",
    category: "proposal",
    externalUrl: driveSearch("Portfolio Brand Services proposal"),
    description: "The $50K/year portfolio services proposal David reviews on today's call.",
    aiSummary: "White-label brand services for up to 5 Catalyst portfolio companies: $50K/year, dedicated strategist, 48-hour urgent turnaround.",
    sourceType: "import",
    orgSlug: "catalyst-ventures",
    personName: "David Liu",
    workName: "Portfolio Brand Services",
    daysAgo: 6,
  },
  {
    fileName: "Luna Wellness Retainer Agreement.pdf",
    category: "contract",
    externalUrl: driveSearch("Luna Wellness Retainer Agreement"),
    description: "Signed monthly retainer agreement, renews in October.",
    aiSummary: "Signed retainer: $6,500/month for social and content management, auto-renews October 1 with a 30 day notice window.",
    sourceType: "import",
    orgSlug: "luna-wellness",
    personName: "Amanda Foster",
    workName: "Monthly Retainer",
    daysAgo: 67,
  },
  {
    fileName: "Horizon Location Launch Kit: Signed Agreement.pdf",
    category: "contract",
    externalUrl: driveSearch("Horizon Location Launch Kit agreement"),
    description: "Countersigned agreement for the 3 location launch kit.",
    aiSummary: "Countersigned $22K agreement covering brand assets for 3 new Horizon gym locations, deposit paid, September start.",
    sourceType: "import",
    orgSlug: "horizon-fitness",
    personName: "Chris Anderson",
    workName: "Location Launch Kit",
    daysAgo: 10,
  },
  {
    fileName: "INV-2026-057: Luna August retainer",
    category: "invoice",
    externalUrl: "{{stripe:lunaHosted}}",
    description: "Paid August retainer invoice, hosted on Stripe.",
    aiSummary: "Paid invoice: $6,500 August retainer for Luna Wellness.",
    sourceType: "email_received",
    orgSlug: "luna-wellness",
    personName: "Amanda Foster",
    daysAgo: 5,
  },
  {
    fileName: "INV-2026-048: Artisan Coffee (overdue)",
    category: "invoice",
    externalUrl: "{{stripe:artisanHosted}}",
    description: "The overdue summer campaign balance, hosted on Stripe.",
    aiSummary: "Open invoice: $4,750 summer campaign balance for Artisan Coffee, 35 days past due after a failed card charge.",
    sourceType: "email_received",
    orgSlug: "artisan-coffee",
    personName: "Nina Patel",
    workName: "Summer Campaign",
    daysAgo: 35,
  },
  {
    fileName: "Salt Demo Studio: Brand Guidelines.pdf",
    category: "brand_asset",
    externalUrl: driveSearch("Salt Demo Studio Brand Guidelines"),
    description: "Your own studio brand guidelines, used to keep outbound work on-brand.",
    aiSummary: "Operator brand asset: logo usage, color palette, typography, and voice guidelines for Salt Demo Studio.",
    sourceType: "upload",
    isOperatorAsset: true,
    daysAgo: 90,
  },
  {
    fileName: "Meridian Product Launch: Video Brief",
    category: "reference",
    externalUrl: driveSearch("Meridian launch video brief"),
    description: "Video brief for the Meridian feature launch, still in review.",
    aiSummary: "Brief for the launch film: 90 second cut, product-led story, delivery tied to the August launch date.",
    sourceType: "import",
    orgSlug: "meridian-tech",
    personName: "James Park",
    workName: "Product Launch Support",
    daysAgo: 8,
  },
  {
    fileName: "Evergreen Q3 Photography Selects",
    category: "media",
    externalUrl: driveSearch("Evergreen Q3 selects"),
    description: "Tom's photography selects from the Q3 refresh shoot.",
    aiSummary: "42 selected frames from the Q3 brand shoot, approved by Sarah for social and retail use.",
    sourceType: "import",
    orgSlug: "evergreen-brands",
    personName: "Tom Bradley",
    workName: "Brand Refresh Q3",
    daysAgo: 12,
  },
];

async function seedResources(
  workspaceId: string,
  userId: string,
  orgIds: Map<string, string>,
  personIds: Map<string, string>,
  stripeUrls: Record<string, string>,
) {
  console.log(`\nSeeding resources (${DEMO_RESOURCES.length} files + links)...`);

  const resources = resolveArtifactUrls(DEMO_RESOURCES, stripeUrls);

  // Resolve work IDs by name for resource → work links
  const { data: workRows } = await supabase
    .from("work")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  const workIdsByName = new Map((workRows ?? []).map((w) => [w.name as string, w.id as string]));

  const personIdsByName = new Map(
    DEMO_ORGS.flatMap((o) => o.contacts.map((c) => [c.name, personIds.get(c.email)] as const))
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );

  for (const resource of resources) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - resource.daysAgo);

    const { data: inserted, error } = await supabase
      .from("resources")
      .insert({
        workspace_id: workspaceId,
        file_name: resource.fileName,
        file_type: "link",
        category: resource.category,
        external_url: resource.externalUrl,
        description: resource.description,
        ai_summary: resource.aiSummary,
        organization_id: resource.orgSlug ? (orgIds.get(resource.orgSlug) ?? null) : null,
        person_id: resource.personName ? (personIdsByName.get(resource.personName) ?? null) : null,
        uploaded_by: userId,
        source_type: resource.sourceType,
        is_operator_asset: resource.isOperatorAsset ?? false,
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ ${resource.fileName}: ${error.message}`);
      continue;
    }

    // Link to the work item so the resource shows up in context
    const workId = resource.workName ? workIdsByName.get(resource.workName) : undefined;
    if (workId && inserted?.id) {
      await supabase.from("entity_links").insert({
        workspace_id: workspaceId,
        source_type: "resource",
        source_id: inserted.id,
        target_type: "work",
        target_id: workId,
        relation_type: "related",
        source: "manual",
        created_by: userId,
      });
    }

    console.log(`  ✓ ${resource.fileName}`);
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

    const meteredSurvivors = await clearDemoData(workspaceId);
    const stripeUrls = await seedStripeArtifacts();

    const orgIds = await seedOrganizations(workspaceId);
    const personIds = await seedPeople(workspaceId, orgIds);
    const personIdsByName = new Map(
      DEMO_ORGS.flatMap((o) => o.contacts.map((c) => [c.name, personIds.get(c.email)] as const))
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    );
    await seedWork(workspaceId, orgIds, personIds);
    await seedMeetings(workspaceId, orgIds, personIds);
    await seedPlays(workspaceId, orgIds, meteredSurvivors, stripeUrls);
    await seedBilling(workspaceId, orgIds);
    await seedProposals(workspaceId);
    await seedOpportunityGaps(workspaceId);
    await seedCaptures(workspaceId, orgIds, personIds);
    await seedFindings(workspaceId, orgIds, personIdsByName);
    await seedConnections(workspaceId);
    await seedNotes(workspaceId, userId, orgIds, personIds);
    await seedResources(workspaceId, userId, orgIds, personIds, stripeUrls);
    await seedMemoryActivity(workspaceId, userId, orgIds, personIds);
    await seedMemoryCustomize(workspaceId, userId);

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
    console.log(`║  • 26 auto-handled plays (Activity + HQ widget)`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_RESOURCES.length} resources with real links`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_CAPTURES.length} activity captures`.padEnd(60) + "║");
    console.log(`║  • ${DEMO_MEETINGS.length} upcoming meetings`.padEnd(60) + "║");
    console.log("║  • 8 watching stories + 13 handled memory writes        ║");
    console.log("║  • 6 customize entries (trust bar 80)                   ║");
    console.log("║  • 5 real Stripe test invoices + 1 payment link         ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log("║  Demo Flow:                                               ║");
    console.log("║  1. /onboarding → walkthrough                             ║");
    console.log("║  2. /hq → revenue, plays, briefing                        ║");
    console.log("║  3. /people → memory surface                              ║");
    console.log("║  4. /work → projects and pipeline                         ║");
    console.log("║  5. /plays → approval outbox                              ║");
    console.log("║  6. /memory → watching, handled, customize                ║");
    console.log("║  7. /resources → files, links, invoices                   ║");
    console.log("╚══════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
