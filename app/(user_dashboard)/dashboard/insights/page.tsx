"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { useDashboardUser } from "@/src/features/shell/contexts/DashboardUserContext";
import { 
  Sparkles,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  Users,
  Clock,
  Star
} from "lucide-react";

export default function InsightsPage() {
  const user = useDashboardUser();
  
  const competitors = [
    { name: "Premier Healthcare Design", price: "$15,000", service: "Full website" },
    { name: "MedWeb Studios", price: "$12,500", service: "Custom build" },
    { name: "HealthTech Designers", price: "$10,000", service: "Template-based" },
    { name: "Clinical Web Co", price: "$13,800", service: "Full service" },
    { name: "Care Site Builders", price: "$9,500", service: "Basic package" },
  ];

  const topClients = [
    { name: "Healthcare Co", amount: "$42,000", projects: 3 },
    { name: "Law Firm LLC", amount: "$28,500", projects: 2 },
    { name: "Acme Corp", amount: "$24,000", projects: 2 },
    { name: "TechStart Inc", amount: "$18,000", projects: 1 },
    { name: "DesignCo", amount: "$15,600", projects: 1 },
  ];

  const sites = [
    { name: "Healthcare Co", status: "healthy", uptime: "100%" },
    { name: "Law Firm LLC", status: "healthy", uptime: "99.9%" },
    { name: "Acme Corp", status: "warning", uptime: "98.2%" },
    { name: "TechStart Inc", status: "healthy", uptime: "100%" },
    { name: "DesignCo", status: "healthy", uptime: "99.8%" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageGreetingHeader page="insights" viewer={user} />

      {/* Tabs */}
      <Tabs defaultValue="strategy">
        <TabsList>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Latest AI Audit
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Healthcare industry analysis</p>
                </div>
                <Badge>Completed</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="text-xl font-semibold mt-1">Healthcare</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Competitors Found</p>
                    <p className="text-xl font-semibold mt-1">47</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Price</p>
                    <p className="text-xl font-semibold mt-1">$12,000</p>
                  </div>
                </div>
                <Button className="w-full md:w-auto">View Full Report</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competitor Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {competitors.map((comp, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.service}</p>
                    </div>
                    <p className="font-semibold">{comp.price}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-success mt-1" />
                <div>
                  <p className="font-medium">Pricing Recommendation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on competitor analysis, you could increase your healthcare website pricing to $14,000-$16,000 
                    while remaining competitive. Your quality metrics support premium positioning.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-6">
          <Card>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-sm">This Month</p>
                </div>
                <p className="text-4xl font-semibold">$18,400</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">One-time Projects</span>
                    <span className="font-medium">$14,000 (76%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '76%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-medium">$4,400 (24%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '24%' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Recurring Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-3xl font-semibold">$4,400</p>
                    <p className="text-sm text-success mt-1">+$800 this month</p>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Growth retainers</span>
                      <span className="font-medium">$3,600</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Maintenance</span>
                      <span className="font-medium">$800</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.projects} projects</p>
                      </div>
                      <p className="font-semibold">{client.amount}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <p className="text-sm">Active Projects</p>
                  </div>
                  <p className="text-3xl font-semibold">7</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">Avg Delivery</p>
                  </div>
                  <p className="text-3xl font-semibold">6 weeks</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <p className="text-sm">Client Rating</p>
                  </div>
                  <p className="text-3xl font-semibold">4.9/5</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm">Success Rate</p>
                  </div>
                  <p className="text-3xl font-semibold">94%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Site Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sites.map((site, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${site.status === 'healthy' ? 'bg-success' : 'bg-warning'}`} />
                      <span className="font-medium text-sm">{site.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{site.uptime} uptime</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

