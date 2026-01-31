"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Users,
  Target,
  TrendingUp,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  credits: number;
  comingSoon?: boolean;
}

const reportTypes: ReportType[] = [
  {
    id: "competitive_analysis",
    title: "Competitive Analysis",
    description:
      "Comprehensive analysis of competitor positioning, messaging, and market strategy.",
    icon: Users,
    credits: 5,
  },
  {
    id: "icp_profile",
    title: "ICP Profile",
    description:
      "Deep-dive ideal customer profile with pain points, desires, and buying triggers.",
    icon: Target,
    credits: 3,
  },
  {
    id: "market_positioning",
    title: "Market Positioning",
    description:
      "Strategic positioning analysis with differentiation opportunities and messaging recommendations.",
    icon: TrendingUp,
    credits: 4,
  },
  {
    id: "content_brief",
    title: "Content Brief",
    description:
      "AI-generated content briefs with SEO optimization and conversion-focused structure.",
    icon: FileText,
    credits: 2,
    comingSoon: true,
  },
];

function ReportTypeCard({ report }: { report: ReportType }) {
  const Icon = report.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{report.title}</CardTitle>
          </div>
          {report.comingSoon ? (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Soon
            </Badge>
          ) : (
            <Badge variant="outline">{report.credits} credits</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{report.description}</p>
        <Button
          variant="outline"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          disabled={report.comingSoon}
        >
          {report.comingSoon ? "Coming Soon" : "Generate Report"}
          {!report.comingSoon && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </CardContent>
    </Card>
  );
}

export function StrategicTab() {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI-Powered Strategic Reports</h3>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive strategic reports using AI analysis. Each report
                provides actionable insights for your clients based on market data,
                competitor analysis, and industry best practices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Available Reports
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {reportTypes.map((report) => (
            <ReportTypeCard key={report.id} report={report} />
          ))}
        </div>
      </div>

      {/* Recent Reports - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Generated reports will appear here. Select a report type above to get
              started.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
