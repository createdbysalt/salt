"use client";

import { StyleguideControls } from "./styleguide-controls";
import { Toaster } from "@/app/_components/ui/toaster";

export default function StyleGuideShell() {
  return (
    <div className="min-h-screen bg-background">
      <StyleguideControls />
      <Toaster />
      
      <div className="container py-12 px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-4">Core UI Design System</h2>
          <p className="text-lg text-muted-foreground">
            Loading... If you see this, the route is working. Check the browser console for errors.
          </p>
        </div>
      </div>
    </div>
  );
}



