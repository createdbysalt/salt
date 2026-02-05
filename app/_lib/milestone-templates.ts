/**
 * Milestone Templates
 *
 * Hardcoded template definitions for quick project setup.
 * Users can select a template when creating a project or from the empty state.
 *
 * Each template contains:
 * - key: Unique identifier
 * - name: Display name
 * - description: Brief description
 * - milestones: Array of milestone definitions with week offsets
 */

export interface MilestoneTemplateDefinition {
  title: string;
  /** Weeks from project start date when this milestone begins */
  weekOffset: number;
  /** Duration in weeks (0 = single day milestone like "Launch") */
  durationWeeks: number;
  /** Optional description for the milestone */
  description?: string;
}

export interface MilestoneTemplate {
  key: string;
  name: string;
  description: string;
  milestones: MilestoneTemplateDefinition[];
}

export const milestoneTemplates = {
  website: {
    key: "website",
    name: "Website Project",
    description: "6-phase web development workflow",
    milestones: [
      {
        title: "Discovery & Strategy",
        weekOffset: 0,
        durationWeeks: 1,
        description: "Research, requirements gathering, and project planning",
      },
      {
        title: "Design Concepts",
        weekOffset: 1,
        durationWeeks: 2,
        description: "Initial design exploration and mockups",
      },
      {
        title: "Design Refinement",
        weekOffset: 3,
        durationWeeks: 1,
        description: "Iterate on feedback and finalize designs",
      },
      {
        title: "Development",
        weekOffset: 4,
        durationWeeks: 3,
        description: "Build and implement the approved designs",
      },
      {
        title: "Review & QA",
        weekOffset: 7,
        durationWeeks: 1,
        description: "Testing, bug fixes, and client review",
      },
      {
        title: "Launch",
        weekOffset: 8,
        durationWeeks: 0,
        description: "Deploy to production and go live",
      },
    ],
  },
  brand: {
    key: "brand",
    name: "Brand Identity",
    description: "5-phase brand development workflow",
    milestones: [
      {
        title: "Discovery & Research",
        weekOffset: 0,
        durationWeeks: 1,
        description: "Understand the business, audience, and competitive landscape",
      },
      {
        title: "Strategy & Positioning",
        weekOffset: 1,
        durationWeeks: 1,
        description: "Define brand positioning, messaging, and personality",
      },
      {
        title: "Initial Concepts",
        weekOffset: 2,
        durationWeeks: 1,
        description: "Present logo concepts and visual direction",
      },
      {
        title: "Refinement",
        weekOffset: 3,
        durationWeeks: 1,
        description: "Refine chosen direction based on feedback",
      },
      {
        title: "Final Delivery",
        weekOffset: 4,
        durationWeeks: 1,
        description: "Deliver final brand assets and guidelines",
      },
    ],
  },
  content: {
    key: "content",
    name: "Content Campaign",
    description: "6-phase content/marketing workflow",
    milestones: [
      {
        title: "Brief & Strategy",
        weekOffset: 0,
        durationWeeks: 1,
        description: "Define campaign goals, audience, and content plan",
      },
      {
        title: "Content Creation",
        weekOffset: 1,
        durationWeeks: 2,
        description: "Write, design, and produce content assets",
      },
      {
        title: "Review & Revisions",
        weekOffset: 3,
        durationWeeks: 1,
        description: "Client review and incorporate feedback",
      },
      {
        title: "Final Approval",
        weekOffset: 4,
        durationWeeks: 1,
        description: "Final sign-off on all deliverables",
      },
      {
        title: "Launch/Publish",
        weekOffset: 5,
        durationWeeks: 0,
        description: "Publish content and begin campaign",
      },
    ],
  },
  simple: {
    key: "simple",
    name: "Simple 3-Phase",
    description: "Minimal milestone structure",
    milestones: [
      {
        title: "Kickoff",
        weekOffset: 0,
        durationWeeks: 1,
        description: "Project initiation and planning",
      },
      {
        title: "Delivery",
        weekOffset: 1,
        durationWeeks: 3,
        description: "Main work and deliverables",
      },
      {
        title: "Final Review",
        weekOffset: 4,
        durationWeeks: 1,
        description: "Review, revisions, and project completion",
      },
    ],
  },
} as const;

export type MilestoneTemplateKey = keyof typeof milestoneTemplates;

/**
 * Get all available templates as an array for UI rendering
 */
export function getTemplateOptions(): MilestoneTemplate[] {
  return Object.values(milestoneTemplates) as unknown as MilestoneTemplate[];
}

/**
 * Get a specific template by key
 */
export function getTemplate(key: MilestoneTemplateKey): MilestoneTemplate {
  return milestoneTemplates[key] as unknown as MilestoneTemplate;
}

/**
 * Calculate milestone due date from project start date and week offset
 */
export function calculateMilestoneDueDate(
  projectStartDate: Date,
  weekOffset: number,
  durationWeeks: number
): Date {
  const dueDate = new Date(projectStartDate);
  // Add weeks to get to the milestone end date
  const totalWeeks = weekOffset + durationWeeks;
  dueDate.setDate(dueDate.getDate() + totalWeeks * 7);
  return dueDate;
}

/**
 * Generate milestone data ready for database insertion
 */
export function generateMilestonesFromTemplate(
  templateKey: MilestoneTemplateKey,
  projectStartDate: Date
): Array<{
  title: string;
  description: string | null;
  due_at: string;
  order_index: number;
  client_visible: boolean;
  status: "not_started" | "in_progress" | "complete";
}> {
  const template = milestoneTemplates[templateKey];

  return template.milestones.map((milestone, index) => ({
    title: milestone.title,
    description: milestone.description || null,
    due_at: calculateMilestoneDueDate(
      projectStartDate,
      milestone.weekOffset,
      milestone.durationWeeks
    ).toISOString(),
    order_index: index,
    client_visible: true, // All visible by default per user decision
    status: "not_started" as const,
  }));
}
