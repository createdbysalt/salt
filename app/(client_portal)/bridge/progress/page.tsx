import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/_components/ui/accordion";
import { CheckCircle, Clock, Calendar, Sparkles } from "lucide-react";
import { Progress } from "@/app/_components/ui/progress";

export const dynamic = "force-dynamic";

export default async function BridgeProgressPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  const supabase = await createClient();

  // Get primary project (UI-only placeholder)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, metadata")
    .eq("client_id", context.client.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const project = projects?.[0];

  // UI-only mock phases
  const mockPhases = [
    {
      id: 1,
      name: "Discovery & Strategy",
      status: "completed",
      dateRange: "Dec 1-15, 2025",
      progress: 100,
      deliverables: [
        "Competitive analysis completed",
        "Brand positioning strategy defined",
        "Project roadmap approved",
      ],
    },
    {
      id: 2,
      name: "Design & Development",
      status: "in-progress",
      dateRange: "Dec 16 - Jan 31, 2026",
      progress: 65,
      deliverables: [
        "✓ Design system finalized",
        "✓ Homepage design approved",
        "🔄 Interior pages design (In progress)",
        "⏳ Content integration (Starting Jan 10)",
      ],
    },
    {
      id: 3,
      name: "Testing & Refinement",
      status: "upcoming",
      dateRange: "Feb 1-10, 2026",
      progress: 0,
      deliverables: [
        "Cross-browser testing",
        "Performance optimization",
        "Content review & polish",
        "Final client approval",
      ],
    },
    {
      id: 4,
      name: "Launch & Handoff",
      status: "upcoming",
      dateRange: "Feb 11-15, 2026",
      progress: 0,
      deliverables: [
        "DNS configuration",
        "Production deployment",
        "Training session",
        "Documentation handoff",
      ],
    },
  ];

  const upcomingMilestones = [
    { date: "Jan 10", label: "Content integration begins" },
    { date: "Jan 24", label: "Interior pages design review" },
    { date: "Feb 1", label: "Full site testing starts" },
    { date: "Feb 10", label: "Final review before launch" },
  ];

  const currentPhase = mockPhases.find((p) => p.status === "in-progress");
  const overallProgress = 65;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
            <Badge variant="secondary" className="font-semibold">
              🚧 Coming Q1-Q2 2026
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Track your project timeline, milestones, and what's coming next
          </p>
        </div>
      </div>

      {/* Project Timeline Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{project?.name || "Your Project"}</CardTitle>
            <Badge variant="default">
              {project?.status === "active" ? "In Development" : project?.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Started: December 1, 2025 • Launch: February 15, 2026
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium">{overallProgress}% Complete</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Current Phase */}
      {currentPhase && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Current Phase</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{currentPhase.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {currentPhase.dateRange} • In Progress ({currentPhase.progress}%)
              </p>
              <Progress value={currentPhase.progress} className="mb-4" />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">What We're Working On:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {currentPhase.deliverables.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-background p-4">
              <h4 className="text-sm font-medium mb-2">Recent Milestones:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Design system finalized</li>
                <li>• Component library built</li>
                <li>• Homepage approved by you</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Phases Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>All Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="phase-2">
            {mockPhases.map((phase) => (
              <AccordionItem key={phase.id} value={`phase-${phase.id}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 text-left">
                    {phase.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : phase.status === "in-progress" ? (
                      <Clock className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                    <div>
                      <div className="font-semibold">{phase.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {phase.dateRange} •{" "}
                        {phase.status === "completed"
                          ? "Completed"
                          : phase.status === "in-progress"
                          ? `In Progress (${phase.progress}%)`
                          : "Upcoming"}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-8 pt-2 space-y-2">
                    {phase.progress > 0 && (
                      <Progress value={phase.progress} className="mb-4" />
                    )}
                    <h4 className="text-sm font-medium">
                      {phase.status === "completed" ? "Deliverables:" : "What to Expect:"}
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {phase.deliverables.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Upcoming Milestones</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Next 30 Days</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                  {milestone.date}
                </div>
                <span className="text-sm">{milestone.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex items-center gap-3 text-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Real-time progress tracking will sync automatically with your project's actual milestones and tasks
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
