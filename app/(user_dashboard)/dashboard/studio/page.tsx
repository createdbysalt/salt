"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye,
  FileText,
  Zap,
  Activity,
  Plus,
  Download,
  Palette,
  Type,
  Tags
} from "lucide-react";
import { TagManagementPanel } from "@/src/features/studio/components/TagManagementPanel";

export default function StudioPage() {
  const topPages = [
    { path: "/", views: 1247, percentage: 15 },
    { path: "/services", views: 892, percentage: 11 },
    { path: "/portfolio", views: 743, percentage: 9 },
    { path: "/about", views: 621, percentage: 8 },
    { path: "/contact", views: 534, percentage: 6 },
  ];

  const documents = [
    { title: "How I Price Projects", category: "Process", updated: "2 weeks ago" },
    { title: "Client Onboarding Process", category: "Process", updated: "1 month ago" },
    { title: "Contract Templates", category: "Legal", updated: "3 months ago" },
  ];

  const colors = [
    { name: "Primary", value: "#0066FF" },
    { name: "Secondary", value: "#1A1A1E" },
    { name: "Accent", value: "#FF6B35" },
    { name: "Background", value: "#FAFAFA" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">My Studio</h1>
        <p className="text-muted-foreground mt-1">Your business website and brand</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Studio Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="brand">Brand Assets</TabsTrigger>
          <TabsTrigger value="tags">Tag Management</TabsTrigger>
        </TabsList>

        {/* Studio Details Tab */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studioName">Studio Name</Label>
                <Input
                  id="studioName"
                  placeholder="Your Studio Name"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://..."
                  disabled
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="Your timezone"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Studio address..."
                  rows={3}
                  disabled
                />
              </div>

              <Button disabled>Save Changes (Coming Soon)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <p className="text-sm">Visitors</p>
                  </div>
                  <p className="text-3xl font-semibold">2,847</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <p className="text-sm">Page Views</p>
                  </div>
                  <p className="text-3xl font-semibold">8,234</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <p className="text-sm">Uptime</p>
                  </div>
                  <p className="text-3xl font-semibold">99.9%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPages.map((page, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">{page.path}</span>
                        <span className="text-muted-foreground">{page.views.toLocaleString()} views</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${page.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-success" />
                      <span className="text-sm">Speed Score</span>
                    </div>
                    <span className="text-2xl font-semibold">94</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '94%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Excellent performance. Site loads in 1.2s on average.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button size="sm" disabled title="Coming soon">
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.category} · Updated {doc.updated}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Assets Tab */}
        <TabsContent value="brand" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Logo Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                        <div className="h-6 w-6 rounded bg-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Primary Logo</p>
                        <p className="text-xs text-muted-foreground">SVG, 24KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <div className="h-6 w-6 rounded bg-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Secondary Logo</p>
                        <p className="text-xs text-muted-foreground">SVG, 18KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" disabled title="Coming soon">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Color Palette
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {colors.map((color, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-lg border border-border"
                          style={{ backgroundColor: color.value }}
                        />
                        <div>
                          <p className="font-medium text-sm">{color.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{color.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Heading Font</p>
                  <p className="text-2xl font-semibold">Inter</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Body Font</p>
                  <p className="text-lg">Inter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tag Management Tab */}
        <TabsContent value="tags">
          <TagManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

