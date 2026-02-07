"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { HelpCircle, User } from "lucide-react";
import { ProjectSwitcher } from "./project-switcher";
import type { BridgeBrandingConfig } from "@/app/_lib/bridge/branding-config";

interface BridgeHeaderProps {
  clientName: string;
  hasMultipleClients?: boolean;
  customLogoUrl?: string;
  branding?: Required<BridgeBrandingConfig>;
}

/**
 * Bridge header with logo, project switcher, and profile menu
 */
export function BridgeHeader({
  clientName,
  hasMultipleClients,
  customLogoUrl,
  branding,
}: BridgeHeaderProps) {
  // Use branding logo if available, fall back to customLogoUrl for backwards compatibility
  const logoLightUrl = branding?.logo?.lightUrl || customLogoUrl;
  const logoDarkUrl = branding?.logo?.darkUrl || customLogoUrl;
  const hasCustomLogo = logoLightUrl || logoDarkUrl;

  return (
    <header 
      className="bg-card border-b border-border shrink-0"
      style={{
        // Apply accent color to header elements via CSS variable
        "--header-accent": branding?.colors?.accent || undefined,
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Studio Logo */}
        <div className="flex items-center gap-3">
          <Link href="/bridge" className="flex items-center">
            {hasCustomLogo ? (
              <>
                {/* Light mode: show dark logo (for light backgrounds) */}
                {logoDarkUrl && (
                  <Image
                    src={logoDarkUrl}
                    alt="Studio"
                    width={120}
                    height={40}
                    className="h-8 w-auto max-w-[120px] object-contain dark:hidden"
                    unoptimized={logoDarkUrl.includes("supabase")}
                  />
                )}
                {/* Dark mode: show light logo (for dark backgrounds) */}
                {logoLightUrl && (
                  <Image
                    src={logoLightUrl}
                    alt="Studio"
                    width={120}
                    height={40}
                    className="h-8 w-auto max-w-[120px] object-contain hidden dark:block"
                    unoptimized={logoLightUrl.includes("supabase")}
                  />
                )}
                {/* Fallback if only one logo variant exists */}
                {!logoDarkUrl && logoLightUrl && (
                  <Image
                    src={logoLightUrl}
                    alt="Studio"
                    width={120}
                    height={40}
                    className="h-8 w-auto max-w-[120px] object-contain dark:hidden"
                    unoptimized={logoLightUrl.includes("supabase")}
                  />
                )}
                {!logoLightUrl && logoDarkUrl && (
                  <Image
                    src={logoDarkUrl}
                    alt="Studio"
                    width={120}
                    height={40}
                    className="h-8 w-auto max-w-[120px] object-contain hidden dark:block"
                    unoptimized={logoDarkUrl.includes("supabase")}
                  />
                )}
              </>
            ) : (
              <>
                <Image
                  src="/salt-logo-black.png"
                  alt="Salt Core"
                  width={32}
                  height={32}
                  className="h-8 w-auto dark:hidden"
                />
                <Image
                  src="/salt-logo-white.png"
                  alt="Salt Core"
                  width={32}
                  height={32}
                  className="h-8 w-auto hidden dark:block"
                />
              </>
            )}
          </Link>
        </div>

        {/* Center: Project Switcher */}
        <div className="hidden sm:block">
          <ProjectSwitcher />
        </div>

        {/* Right: Help + Profile */}
        <div className="flex items-center gap-2">
          {/* Help Button */}
          <Button variant="ghost" size="icon" title="Help & Resources">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{clientName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasMultipleClients && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/select">Switch Client</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
