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

interface BridgeHeaderProps {
  clientName: string;
  hasMultipleClients?: boolean;
  customLogoUrl?: string;
}

/**
 * Bridge header with logo, project switcher, and profile menu
 */
export function BridgeHeader({
  clientName,
  hasMultipleClients,
  customLogoUrl,
}: BridgeHeaderProps) {
  return (
    <header className="bg-card border-b border-border shrink-0">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Studio Logo */}
        <div className="flex items-center gap-3">
          <Link href="/bridge" className="flex items-center">
            {customLogoUrl ? (
              <Image
                src={customLogoUrl}
                alt="Studio"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            ) : (
              <>
                <Image
                  src="/salt-logo-black.png"
                  alt="Studio"
                  width={32}
                  height={32}
                  className="h-8 w-auto dark:hidden"
                />
                <Image
                  src="/salt-logo-white.png"
                  alt="Studio"
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
