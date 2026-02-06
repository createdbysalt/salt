import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { TrendingUp, Sparkles, Brain, Gauge, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BridgeIntelligencePage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/");
  }

  if (!context.client) {
    redirect("/select");
  }

  // UI-only placeholders for mock reports
  const mockStrategicReports = [
    {
      id: "sr-1",
      title: "Competitive Intelligence Report",
      date: "December 15, 2025",
      summary: "Deep analysis of 5 competitors to identify strategic opportunities",
      insights: ["3 major positioning gaps found", "Competitors weak on mobile UX", "Premium service tier opportunity"],
    },
    {
      id: "sr-2",
      title: "Brand Positioning Strategy",
      date: "December 18, 2025",
      summary: "Strategic framework for market positioning",
      insights: ["Position as premium expert", "Target: Mid-market ($5M-50M)", "Message: Personalized service at scale"],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Intelligence</h1>
            <Badge variant="secondary" className="font-semibold">
              🚧 Coming Q1-Q2 2026
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Strategic insights and measurable results that prove your investment
          </p>
        </div>
      </div>

      {/* Intelligence Tabs */}
      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strategic">Strategic Reports</TabsTrigger>
          <TabsTrigger value="performance">Performance (Live)</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        {/* Strategic Reports Tab */}
        <TabsContent value="strategic" className="mt-6 space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Intelligence created to inform your business strategy
          </div>

          {mockStrategicReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{report.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generated: {report.date}
                    </p>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{report.summary}</p>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Insights:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {report.insights.map((insight, idx) => (
                      <li key={idx}>• {insight}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="default" size="sm" disabled>
                    Read full report →
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Performance (Live) Tab */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Real-time monitoring of your website's business impact
          </div>

          {/* Overall Health Score */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary">
                  <span className="text-3xl font-bold">89</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Your Site Performance</h3>
                  <Badge variant="default" className="mt-2">Excellent ✓</Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your site performs better than 85% of websites in your industry. All key metrics are healthy.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Key Metrics This Month</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4" />
                    Site Speed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">Excellent</div>
                  <p className="text-sm text-muted-foreground">
                    Loads in 1.4 seconds
                  </p>
                  <p className="text-sm text-muted-foreground">
                    40% faster than competitors
                  </p>
                  <Button variant="link" className="p-0 h-auto" disabled>
                    View details →
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    SEO Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">Improving ↗</div>
                  <p className="text-sm text-muted-foreground">
                    +8 keywords in top 10
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Now ranking #1 for "target keyword"
                  </p>
                  <Button variant="link" className="p-0 h-auto" disabled>
                    View rankings →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Monthly Brief */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Monthly Intelligence Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                December 2025 Performance Report - Generated: January 1, 2026
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Comprehensive analysis of all performance metrics, business impact, and recommendations for January.
              </p>
              <Button variant="outline" disabled>
                Download full report PDF →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="mt-6">
          <div className="text-sm text-muted-foreground mb-4">
            All historical reports and intelligence
          </div>

          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="rounded-full bg-muted/50 p-4 inline-block mb-4">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Archive Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  All your intelligence reports will be automatically archived here for easy reference and historical analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
