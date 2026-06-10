"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Palette,
  CreditCard,
  User,
  Bell,
  Tags,
  Package,
  FileText,
  Users,
  Shield,
  Link2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui";

const SETTINGS_SECTIONS = [
  {
    label: "Studio",
    items: [
      { id: "profile", label: "Profile", icon: Building2 },
      { id: "brand", label: "Brand", icon: Palette },
      { id: "team", label: "Team Members", icon: Users },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "services", label: "Services", icon: Package },
      { id: "templates", label: "Templates", icon: FileText },
      { id: "tags", label: "Tags", icon: Tags },
      { id: "integrations", label: "Integrations", icon: Link2 },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "account", label: "Account", icon: User },
      { id: "billing", label: "Billing", icon: CreditCard },
      { id: "security", label: "Security", icon: Shield },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export function SettingsSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get("section") || "profile";

  const handleSectionChange = (sectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "customize");
    if (sectionId === "profile") {
      params.delete("section");
    } else {
      params.set("section", sectionId);
    }
    const newUrl = `/studio?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  return (
    <Sidebar
      collapsible="none"
      className="hidden md:flex border-r bg-transparent"
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
    >
      <SidebarContent className="pt-4">
        {SETTINGS_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleSectionChange(item.id)}
                        className="cursor-pointer"
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
