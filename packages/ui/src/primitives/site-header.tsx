"use client"

import * as React from "react"
import { Plus, ListFilter, SlidersHorizontal } from "lucide-react"
import { Button } from "./button"
import { Separator } from "./separator"
import { SidebarTrigger } from "./sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"

export function SiteHeader() {
  const [view, setView] = React.useState("overview")

  return (
    <div className="flex flex-col">
      {/* Primary header row */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Studio Name</h1>
          <div className="ml-auto">
            <Button size="sm" variant="secondary">
              <Plus className="h-4 w-4" />
              New Client
            </Button>
          </div>
        </div>
      </header>

      {/* Secondary row */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-2 px-4 lg:px-6">
          <Button
            size="sm"
            variant={view === "overview" ? "outline" : "secondary"}
            onClick={() => setView("overview")}
            className="text-xs h-6 px-2"
          >
            Overview
          </Button>
          <Button
            size="sm"
            variant={view === "customize" ? "outline" : "secondary"}
            onClick={() => setView("customize")}
            className="text-xs h-6 px-2"
          >
            Customize
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-muted-foreground">
                  <ListFilter className="h-3 w-3 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>Active</DropdownMenuItem>
                <DropdownMenuItem>Archived</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-muted-foreground">
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Display
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Grid</DropdownMenuItem>
                <DropdownMenuItem>List</DropdownMenuItem>
                <DropdownMenuItem>Table</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
