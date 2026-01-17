"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { ChevronDown, FolderKanban, HelpCircle, User } from "lucide-react";

interface BridgeHeaderProps {
  clientName: string;
  projects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  currentProjectId?: string | null;
  hasMultipleClients?: boolean;
  customLogoUrl?: string;
}

export function BridgeHeader({
  clientName,
  projects,
  currentProjectId,
  hasMultipleClients,
  customLogoUrl,
}: BridgeHeaderProps) {
  const pathname = usePathname();

  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId)
    : null;

  return (
    <header className="bg-card border-b border-border shrink-0">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Studio Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/bridge"
            className="flex items-center"
          >
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

        {/* Center: Project Switcher (if multiple projects) */}
        {projects && projects.length > 1 && (
          <div className="hidden sm:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <FolderKanban className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {currentProject
                      ? currentProject.name
                      : "All Projects"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/bridge">All Projects</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuItem key={project.id} asChild>
                    <Link href={`/bridge/projects/${project.id}`}>
                      {project.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
                    <Link href="/bridge/select">Switch Client</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/bridge/settings">Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

