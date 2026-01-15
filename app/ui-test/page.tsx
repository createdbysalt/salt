"use client";

import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * UI Testing Page - Bypasses authentication to test components
 * Access at: http://localhost:3000/ui-test
 */
export default function UITestPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const mockUser = {
    firstName: "Gabriella"
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-test-theme">
      <div className="min-h-screen bg-background text-foreground p-8 space-y-8">

        {/* Header Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b border-border pb-2">
            🎯 Greeting Header Test
          </h2>
          <PageGreetingHeader
            page="settings"
            viewer={mockUser}
            variant="dashboard"
            mode="greeting"
          />
        </section>

        {/* Theme Toggle Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b border-border pb-2">
            🌓 Theme Toggle Test
          </h2>
          <Card className="w-fit">
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-8">
                <div className="space-y-0.5">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tabs Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b border-border pb-2">
            📑 Settings Tabs Test
          </h2>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Profile settings would go here. The theme toggle should be visible and functional above.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Notification preferences...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Security options...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Billing information...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Component State Display */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b border-border pb-2">
            🔍 Component State
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current State</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Active Tab:</strong> {activeTab}</p>
                <p><strong>User:</strong> {mockUser.firstName}</p>
                <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSS Classes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>HTML Classes:</strong> {typeof window !== 'undefined' ? document?.documentElement?.className || 'Loading...' : 'Server rendering'}</p>
                <p><strong>Theme Provider:</strong> ✅ Active</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Instructions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b border-border pb-2">
            📝 Testing Instructions
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p><strong>1. Greeting Header:</strong> Should show personalized greeting with your name</p>
                <p><strong>2. Theme Toggle:</strong> Click the sun/moon icon to switch between light/dark themes</p>
                <p><strong>3. Tab Navigation:</strong> Click each tab to verify content switching works</p>
                <p><strong>4. Visual Verification:</strong> All elements should be properly styled and responsive</p>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </ThemeProvider>
  );
}