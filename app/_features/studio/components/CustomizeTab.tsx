"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@repo/ui";
import { SettingsSidebar } from "./customize/SettingsSidebar";
import { ProfileSection } from "./customize/ProfileSection";
import { BrandSection } from "./customize/BrandSection";
import { ServicesSection } from "./customize/ServicesSection";
import { TemplatesSection } from "./customize/TemplatesSection";
import { TagsSection } from "./customize/TagsSection";

const VALID_SECTIONS = [
  "profile",
  "brand",
  "team",
  "services",
  "templates",
  "tags",
  "integrations",
  "account",
  "billing",
  "security",
  "notifications",
] as const;

type SectionId = (typeof VALID_SECTIONS)[number];

export function CustomizeTab() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") as SectionId | null;
  const activeSection =
    sectionParam && VALID_SECTIONS.includes(sectionParam)
      ? sectionParam
      : "profile";

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
    >
      <div className="flex min-h-[600px] w-full rounded-lg border bg-background overflow-hidden">
        <SettingsSidebar />
        <SidebarInset className="flex-1 p-6 overflow-auto">
          {activeSection === "profile" && <ProfileSection />}
          {activeSection === "brand" && <BrandSection />}
          {activeSection === "services" && <ServicesSection />}
          {activeSection === "templates" && <TemplatesSection />}
          {activeSection === "tags" && <TagsSection />}
          {/* Placeholder sections for new items */}
          {activeSection === "team" && <PlaceholderSection title="Team Members" />}
          {activeSection === "integrations" && <PlaceholderSection title="Integrations" />}
          {activeSection === "account" && <PlaceholderSection title="Account" />}
          {activeSection === "billing" && <PlaceholderSection title="Billing" />}
          {activeSection === "security" && <PlaceholderSection title="Security" />}
          {activeSection === "notifications" && <PlaceholderSection title="Notifications" />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}
