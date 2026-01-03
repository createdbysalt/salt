import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatGrid } from "@/components/patterns/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Users, 
  FolderKanban, 
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { SetupFloatingBadge } from "@/src/features/onboarding/components/SetupFloatingBadge";
import { SetupCelebrationWrapper } from "@/src/features/onboarding/components/SetupCelebrationWrapper";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Celebration Modal */}
      <SetupCelebrationWrapper />
      
      {/* Floating Setup Badge */}
      <SetupFloatingBadge />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid - Always 4 columns */}
      <StatGrid columns={4}>
        <StatCard
          title="Total Revenue"
          value="$45,231"
          icon={DollarSign}
          trend={{ value: 12.5, label: "vs last month", isPositive: true }}
        />
        <StatCard
          title="Active Clients"
          value="23"
          icon={Users}
          trend={{ value: 8.2, label: "vs last month", isPositive: true }}
        />
        <StatCard
          title="Projects"
          value="12"
          icon={FolderKanban}
          description="8 active, 4 completed"
        />
        <StatCard
          title="Completion Rate"
          value="94.2%"
          icon={TrendingUp}
          trend={{ value: 3.1, label: "vs last quarter", isPositive: true }}
        />
      </StatGrid>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Line Chart */}
            <div className="space-y-4">
              <div className="h-[240px] w-full">
                <svg
                  viewBox="0 0 600 200"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="600" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-border" opacity="0.3" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-border" opacity="0.3" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="currentColor" strokeWidth="0.5" className="text-border" opacity="0.3" />
                  
                  {/* Area under the line */}
                  <path
                    d="M 0 84 L 120 106 L 240 65 L 360 26 L 480 46 L 600 0 L 600 200 L 0 200 Z"
                    fill="currentColor"
                    className="text-primary"
                    opacity="0.1"
                  />
                  
                  {/* Main line */}
                  <path
                    d="M 0 84 L 120 106 L 240 65 L 360 26 L 480 46 L 600 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-primary"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points */}
                  {[
                    { x: 0, y: 84 },
                    { x: 120, y: 106 },
                    { x: 240, y: 65 },
                    { x: 360, y: 26 },
                    { x: 480, y: 46 },
                    { x: 600, y: 0 },
                  ].map((point, i) => (
                    <g key={i}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-primary"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="10"
                        fill="transparent"
                        className="hover:fill-primary/10 transition-all cursor-pointer"
                      />
                    </g>
                  ))}
                </svg>
              </div>
              
              {/* X-axis labels */}
              <div className="flex items-center justify-between px-1">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                  <span key={i} className="text-xs text-muted-foreground font-medium">
                    {month}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Findings */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold">Key Findings</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">40.6% growth</span> from January to June, reaching $45k
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Strongest month: April</span> with $42k, driven by 3 major project completions
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">February dip:</span> -12.5% due to seasonal slowdown, recovered in March
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { client: 'Acme Corp', action: 'Project completed', time: '2 hours ago', status: 'success' },
                { client: 'TechStart', action: 'Payment received', time: '5 hours ago', status: 'success' },
                { client: 'DesignCo', action: 'Milestone approved', time: '1 day ago', status: 'success' },
                { client: 'BuildRight', action: 'Feedback pending', time: '2 days ago', status: 'pending' },
                { client: 'MarketPro', action: 'Review requested', time: '3 days ago', status: 'pending' },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                    {activity.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium">{activity.client}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Projects</h2>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { 
              name: 'Website Redesign', 
              client: 'Acme Corp', 
              progress: 75, 
              status: 'on-track',
              dueDate: 'Dec 15, 2024',
              team: 3
            },
            { 
              name: 'Mobile App Development', 
              client: 'TechStart', 
              progress: 45, 
              status: 'on-track',
              dueDate: 'Jan 30, 2025',
              team: 5
            },
            { 
              name: 'Brand Identity', 
              client: 'DesignCo', 
              progress: 90, 
              status: 'at-risk',
              dueDate: 'Dec 5, 2024',
              team: 2
            },
          ].map((project, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant={project.status === 'at-risk' ? 'destructive' : 'secondary'}>
                    {project.status === 'at-risk' ? 'At Risk' : 'On Track'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.client}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {project.dueDate}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {project.team} members
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold">127</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold">23</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
                <AlertCircle className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-semibold">8</p>
                <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

