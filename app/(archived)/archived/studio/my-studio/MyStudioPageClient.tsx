"use client";

import { PageHeader } from "@repo/patterns";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Progress } from "@/app/_components/ui/progress";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import {
  Building2,
  Palette,
  Briefcase,
  FolderOpen,
  Tags,
  FileText,
  Check,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Studio {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
}

interface BrandConfig {
  id: string;
  studio_id: string;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  color_primary?: string | null;
  color_secondary?: string | null;
  voice_tone?: string[] | null;
}

interface SetupChecks {
  hasLogo: boolean;
  hasDescription: boolean;
  hasBrandVoice: boolean;
  hasColors: boolean;
  hasServices: boolean;
  hasPortfolio: boolean;
}

interface MyStudioPageClientProps {
  studio: Studio;
  brandConfig: BrandConfig | null;
  setupProgress: number;
  setupChecks: SetupChecks;
}

export function MyStudioPageClient({
  studio,
  brandConfig,
  setupProgress,
  setupChecks,
}: MyStudioPageClientProps) {
  const setupItems = [
    { key: "hasLogo", label: "Upload logo", href: "/studio/my-studio/brand" },
    { key: "hasDescription", label: "Add studio description", href: "/studio/my-studio/profile" },
    { key: "hasBrandVoice", label: "Define brand voice", href: "/studio/my-studio/brand" },
    { key: "hasColors", label: "Set brand colors", href: "/studio/my-studio/brand" },
    { key: "hasServices", label: "Add services", href: "/studio/my-studio/services" },
    { key: "hasPortfolio", label: "Add portfolio items", href: "/studio/my-studio/portfolio" },
  ];

  const tabs = [
    { value: "profile", label: "Profile", icon: Building2, href: "/studio/my-studio/profile" },
    { value: "brand", label: "Brand", icon: Palette, href: "/studio/my-studio/brand" },
    { value: "services", label: "Services", icon: Briefcase, href: "/studio/my-studio/services" },
    { value: "portfolio", label: "Portfolio", icon: FolderOpen, href: "/studio/my-studio/portfolio" },
    { value: "templates", label: "Templates", icon: FileText, href: "/studio/my-studio/templates" },
    { value: "tags", label: "Tags", icon: Tags, href: "/studio/my-studio/tags" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Studio"
        description={`Configure and customize ${studio.name}`}
        noBorder
      />

      {/* Setup Progress */}
      {setupProgress < 100 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Studio Setup</CardTitle>
              <Badge variant="secondary">{setupProgress}% complete</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={setupProgress} className="h-2" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {setupItems.map((item) => {
                const isComplete = setupChecks[item.key as keyof SetupChecks];
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
                      isComplete
                        ? "border-success/30 bg-success/5 text-success"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={isComplete ? "line-through opacity-70" : ""}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {tabs.slice(0, 3).map((tab) => (
          <Link key={tab.value} href={tab.href}>
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <tab.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{tab.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tab.value === "profile" && "Studio info & settings"}
                      {tab.value === "brand" && "Logo, colors & voice"}
                      {tab.value === "services" && "What you offer"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* All Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Studio Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
              >
                <tab.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{tab.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
