"use client";

import { useState } from "react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Separator,
  Input,
  Label,
  Textarea,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { LineChart, BarChart } from "@/components/charts";
import { 
  DataTile,
  DotMatrix,
  MiniBars,
  RadialGauge,
  generateDotMatrixData,
  generateMiniBarData,
} from "@/components/dataviz";
import { getAllAccentPresets } from "@/libs/theme";

export default function StyleGuidePage() {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [selectedAccent, setSelectedAccent] = useState("ocean");
  const [reducedMotion, setReducedMotion] = useState(false);

  const accents = getAllAccentPresets();

  // Apply theme changes to HTML element
  const applyTheme = (mode: "light" | "dark", accent: string, motion: boolean) => {
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.setAttribute("data-accent", accent);
    if (motion) {
      document.documentElement.setAttribute("data-reduced-motion", "true");
    } else {
      document.documentElement.removeAttribute("data-reduced-motion");
    }
  };

  const handleThemeChange = (mode: "light" | "dark") => {
    setThemeMode(mode);
    applyTheme(mode, selectedAccent, reducedMotion);
  };

  const handleAccentChange = (accent: string) => {
    setSelectedAccent(accent);
    applyTheme(themeMode, accent, reducedMotion);
  };

  const handleMotionChange = (motion: boolean) => {
    setReducedMotion(motion);
    applyTheme(themeMode, selectedAccent, motion);
  };

  // Sample chart data
  const lineData = [
    { month: "Jan", visitors: 400, conversions: 240 },
    { month: "Feb", visitors: 300, conversions: 139 },
    { month: "Mar", visitors: 200, conversions: 980 },
    { month: "Apr", visitors: 278, conversions: 390 },
    { month: "May", visitors: 189, conversions: 480 },
    { month: "Jun", visitors: 239, conversions: 380 },
  ];

  const barData = [
    { name: "Mon", value: 120 },
    { name: "Tue", value: 210 },
    { name: "Wed", value: 180 },
    { name: "Thu", value: 240 },
    { name: "Fri", value: 200 },
  ];

  // Bento data viz sample data
  const conversionData = generateDotMatrixData(30, 6, 0.72);
  const achievementData = generateMiniBarData(4);
  const growthData = generateMiniBarData(4);
  const skillRings = [
    { value: 64, label: "All Skill", color: "rgb(var(--chart-4))" },
    { value: 50, label: "UX", color: "rgb(var(--chart-4))" },
    { value: 40, label: "UI", color: "rgb(var(--chart-4))" },
    { value: 28, label: "Branding", color: "rgb(var(--chart-4))" },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Salt Core Design System
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Three-layer integration strategy for colors, branding, and system integrity.
          </p>
        </div>

        <Separator />

        {/* Three-Layer Strategy Overview */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              Three-Layer Integration Strategy
            </CardTitle>
            <CardDescription>
              Salt Core uses a three-layer approach to balance brand identity, data clarity, and system consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Layer 1 */}
              <div className="space-y-3 rounded-lg border border-primary/50 bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Brand Layer</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Salt Blue (#6b9cff) drives user-facing interactions
                </p>
                <div className="space-y-1 text-xs">
                  <p>• Primary buttons & CTAs</p>
                  <p>• Links & navigation</p>
                  <p>• Active states</p>
                </div>
                <Button size="sm" className="w-full">Salt Blue CTA</Button>
              </div>

              {/* Layer 2 */}
              <div className="space-y-3 rounded-lg border border-[--chart-1]/50 bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold" style={{ backgroundColor: 'rgb(var(--chart-1))', color: '#fff' }}>
                    2
                  </div>
                  <h3 className="font-semibold">Data Viz Layer</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Multi-color system for data clarity
                </p>
                <div className="space-y-1 text-xs">
                  <p>• Chart colors</p>
                  <p>• Stat cards & metrics</p>
                  <p>• Data categories</p>
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: 'rgb(var(--chart-1))' }} title="Emerald" />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: 'rgb(var(--chart-2))' }} title="Blue" />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: 'rgb(var(--chart-3))' }} title="Orange" />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: 'rgb(var(--chart-4))' }} title="Lime" />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: 'rgb(var(--chart-5))' }} title="Violet" />
                </div>
              </div>

              {/* Layer 3 */}
              <div className="space-y-3 rounded-lg border border-muted-foreground/30 bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground text-lg font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">System Layer</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Foundation remains unchanged
                </p>
                <div className="space-y-1 text-xs">
                  <p>• Spacing system</p>
                  <p>• Typography scale</p>
                  <p>• Border radius</p>
                  <p>• Grid structure</p>
                </div>
                <p className="text-xs italic text-muted-foreground">
                  Core integrity maintained
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Theme Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
            <CardDescription>
              Test light/dark modes, accent presets, and reduced motion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Toggle */}
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={themeMode === "dark" ? "default" : "outline"}
                  onClick={() => handleThemeChange("dark")}
                >
                  Dark (default)
                </Button>
                <Button
                  variant={themeMode === "light" ? "default" : "outline"}
                  onClick={() => handleThemeChange("light")}
                >
                  Light
                </Button>
              </div>
            </div>

            {/* Accent Preset Picker */}
            <div className="space-y-2">
              <Label>Accent Preset</Label>
              <div className="flex flex-wrap gap-2">
                {accents.map((accent) => (
                  <button
                    key={accent.id}
                    onClick={() => handleAccentChange(accent.id)}
                    className={`flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 transition-all ${
                      selectedAccent === accent.id
                        ? "border-[--primary] shadow-md"
                        : "border-[--border] hover:border-[--muted-foreground]"
                    }`}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor:
                          themeMode === "dark"
                            ? accent.preview.dark
                            : accent.preview.light,
                      }}
                    />
                    <span className="text-xs font-medium">
                      {accent.displayName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reduced Motion */}
            <div className="space-y-2">
              <Label>Reduced Motion</Label>
              <Button
                variant={reducedMotion ? "default" : "outline"}
                onClick={() => handleMotionChange(!reducedMotion)}
              >
                {reducedMotion ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Layer 1: Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Layer 1: Brand Colors</CardTitle>
            <CardDescription>
              Salt Blue accent used for all interactive elements (buttons, links, navigation)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--primary] border-2 border-primary" />
                <p className="text-xs font-mono font-semibold">--primary</p>
                <p className="text-xs text-muted-foreground">Salt Blue CTAs</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--secondary]" />
                <p className="text-xs font-mono">--secondary</p>
                <p className="text-xs text-muted-foreground">Subtle actions</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--background] border border-[--border]" />
                <p className="text-xs font-mono">--background</p>
                <p className="text-xs text-muted-foreground">#0f0f0f</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--card] border border-[--border]" />
                <p className="text-xs font-mono">--card</p>
                <p className="text-xs text-muted-foreground">Elevated surface</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layer 2: Data Visualization Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Layer 2: Data Visualization Colors</CardTitle>
            <CardDescription>
              Multi-color palette for charts, metrics, and data categories (NOT for buttons/CTAs)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <div className="h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--chart-1))' }} />
                <p className="text-xs font-mono">--chart-1</p>
                <p className="text-xs text-muted-foreground">Emerald #3fb892</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--chart-2))' }} />
                <p className="text-xs font-mono">--chart-2</p>
                <p className="text-xs text-muted-foreground">Blue #6b9cff</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--chart-3))' }} />
                <p className="text-xs font-mono">--chart-3</p>
                <p className="text-xs text-muted-foreground">Orange #ff7b54</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--chart-4))' }} />
                <p className="text-xs font-mono">--chart-4</p>
                <p className="text-xs text-muted-foreground">Lime #d4ff5e</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--chart-5))' }} />
                <p className="text-xs font-mono">--chart-5</p>
                <p className="text-xs text-muted-foreground">Violet #b8b3ff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semantic Status Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Semantic Status Colors</CardTitle>
            <CardDescription>
              Fixed palette for success, warning, error, and info states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--success]" />
                <p className="text-xs font-mono">--success</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--warning]" />
                <p className="text-xs font-mono">--warning</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--destructive]" />
                <p className="text-xs font-mono">--destructive</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-[--info]" />
                <p className="text-xs font-mono">--info</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layer 1: Buttons (Brand) */}
        <Card>
          <CardHeader>
            <CardTitle>Layer 1: Buttons (Brand Color)</CardTitle>
            <CardDescription>
              Primary buttons use Salt Blue. These are for CTAs, navigation, and interactive elements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary (Salt Blue)</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
              <Button variant="outline" disabled>
                Disabled Outline
              </Button>
            </div>
            <div className="mt-4 rounded-lg bg-muted/30 p-4 border-l-4 border-primary">
              <p className="text-sm">
                <strong>✅ Use Layer 1 (Brand) for:</strong> Buttons, CTAs, links, navigation, active states
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>Inputs with consistent focus states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Input</Label>
              <Input placeholder="Enter text..." />
            </div>
            <div className="space-y-2">
              <Label>Textarea</Label>
              <Textarea placeholder="Enter longer text..." />
            </div>
            <div className="space-y-2">
              <Label>Disabled Input</Label>
              <Input disabled placeholder="Disabled..." />
            </div>
          </CardContent>
        </Card>

        {/* Skeleton Loading */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Skeleton components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layer 2: Charts (Data) */}
        <Card>
          <CardHeader>
            <CardTitle>Layer 2: Data Visualization (Multi-Color)</CardTitle>
            <CardDescription>
              Charts use the multi-color palette (--chart-1 through --chart-5) for data clarity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="rounded-lg bg-muted/30 p-4 border-l-4 border-[--chart-1]">
              <p className="text-sm">
                <strong>✅ Use Layer 2 (Multi-Color) for:</strong> Charts, stat cards, metrics, KPIs, data categories
              </p>
              <p className="text-sm mt-2 text-muted-foreground">
                <strong>❌ Don't use brand blue for all data series</strong> - use distinct colors for clarity
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Line Chart (Multi-Series)</h3>
              <LineChart
                data={lineData}
                lines={[
                  { dataKey: "visitors", name: "Visitors" },
                  { dataKey: "conversions", name: "Conversions" },
                ]}
                xAxisKey="month"
                height={250}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                ↑ Each series gets a distinct color from --chart-1 (Emerald) and --chart-2 (Blue)
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Bar Chart (Single Series)</h3>
              <BarChart
                data={barData}
                bars={[{ dataKey: "value", name: "Revenue" }]}
                xAxisKey="name"
                height={250}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                ↑ Single series uses --chart-1 (Emerald) by default
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Multi-Series Bar Chart</h3>
              <BarChart
                data={[
                  { name: "Mon", revenue: 120, expenses: 80 },
                  { name: "Tue", revenue: 210, expenses: 140 },
                  { name: "Wed", revenue: 180, expenses: 100 },
                  { name: "Thu", revenue: 240, expenses: 160 },
                  { name: "Fri", revenue: 200, expenses: 120 },
                ]}
                bars={[
                  { dataKey: "revenue", name: "Revenue" },
                  { dataKey: "expenses", name: "Expenses" },
                ]}
                xAxisKey="name"
                height={250}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                ↑ Each series automatically gets a distinct color from the multi-color palette
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Layer 3: Typography (System) */}
        <Card>
          <CardHeader>
            <CardTitle>Layer 3: Typography (System)</CardTitle>
            <CardDescription>
              Geist Sans type scale - foundation that remains unchanged across all themes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h1 className="text-5xl font-bold">Heading 1 (48px)</h1>
            </div>
            <div>
              <h2 className="text-4xl font-bold">Heading 2 (36px)</h2>
            </div>
            <div>
              <h3 className="text-3xl font-semibold">Heading 3 (30px)</h3>
            </div>
            <div>
              <h4 className="text-2xl font-semibold">Heading 4 (24px)</h4>
            </div>
            <div>
              <p className="text-base text-muted-foreground">
                Body text (16px) in muted foreground. The quick brown fox jumps
                over the lazy dog.
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Small text (14px). The quick brown fox jumps over the lazy dog.
              </p>
            </div>
            <div>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                Monospace code (Geist Mono)
              </code>
            </div>
            <div className="mt-4 rounded-lg bg-muted/30 p-4 border-l-4 border-muted-foreground">
              <p className="text-sm">
                <strong>Layer 3 (System):</strong> Typography, spacing, border radius, and grid structure remain consistent across all accent presets and themes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card className="border-primary/20 bg-gradient-to-br from-muted/20 to-transparent">
          <CardHeader>
            <CardTitle>Quick Reference Guide</CardTitle>
            <CardDescription>
              When should I use which layer?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-primary/50 bg-card p-4">
                  <h4 className="font-semibold text-primary">✅ Do This</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use <code className="bg-muted px-1 rounded">--primary</code> for buttons and CTAs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use <code className="bg-muted px-1 rounded">--chart-1</code> through <code className="bg-muted px-1 rounded">--chart-5</code> for data visualization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use multi-color palette for charts with multiple series</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Keep system tokens (spacing, typography) consistent</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 rounded-lg border border-destructive/50 bg-card p-4">
                  <h4 className="font-semibold text-destructive">❌ Don't Do This</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Don't use brand color for all data series</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Don't use data viz colors for buttons/CTAs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Don't create custom spacing or typography scales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Don't mix brand and data colors randomly</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/30 p-4">
                <h4 className="font-semibold mb-3">Decision Matrix</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">CTA Button</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary">Layer 1 (Brand)</span>
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">Chart Line</span>
                    <span className="text-muted-foreground">→</span>
                    <span style={{ color: 'rgb(var(--chart-1))' }}>Layer 2 (Data)</span>
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">Navigation Link</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary">Layer 1 (Brand)</span>
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">Stat Card Icon</span>
                    <span className="text-muted-foreground">→</span>
                    <span style={{ color: 'rgb(var(--chart-2))' }}>Layer 2 (Data)</span>
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">Card Padding</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">Layer 3 (System)</span>
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    <span className="font-medium">Text Size</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">Layer 3 (System)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bento Data Visualization */}
        <div className="rounded-xl bg-[rgb(var(--dv-canvas))] p-[var(--dv-canvas-pad)]">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">Bento Data Visualization</h2>
            <p className="mt-2 text-lg text-white/60">
              Pixel-perfect dashboard tiles with mixed surfaces (white/tinted/deep) on black canvas
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Conversion Rate - Dot Matrix */}
            <DataTile
              variant="surface"
              title="CONVERSION RATE"
              subtitle="In the past 1 month"
              metric="120%"
            >
              <DotMatrix values={conversionData} columns={30} rows={6} />
            </DataTile>

            {/* Skill Rate - Multi-ring Radial */}
            <DataTile
              variant="deepEmerald"
              title="SKILL RATE"
              subtitle="In the past 7 days"
              action={
                <Button 
                  size="sm" 
                  className="rounded-full bg-[rgb(var(--chart-4))] text-[rgb(var(--dv-deep-emerald-bg))] hover:bg-[rgb(var(--chart-4))]/90 h-8 px-4"
                >
                  See All
                </Button>
              }
            >
              <RadialGauge
                rings={skillRings}
                size={240}
                thickness={10}
                ringGap={6}
                showCenterLabel={true}
                showRingLabels={true}
              />
            </DataTile>

            {/* Achievement - Mini Bars */}
            <DataTile
              variant="surface"
              title="ACHIEVEMENT"
              subtitle=""
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">📈</div>
                <MiniBars 
                  data={achievementData}
                  color="rgb(var(--chart-2))"
                  height={100}
                  barWidth={16}
                  xAxisLabels={["2021", "2022", "2023", "2024"]}
                />
              </div>
            </DataTile>

            {/* Activity - Single Ring Radial */}
            <DataTile
              variant="tintBlue"
              title="ACTIVITY"
              subtitle=""
              action={
                <Button 
                  size="sm" 
                  className="rounded-full h-8 px-4"
                >
                  See All
                </Button>
              }
            >
              <div className="flex items-center justify-center py-8">
                <RadialGauge
                  value={78}
                  color="rgb(var(--chart-2))"
                  size={180}
                  thickness={16}
                  showCenterLabel={true}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-medium">Updates</p>
              </div>
            </DataTile>

            {/* Growth - Mini Bars */}
            <DataTile
              variant="tintViolet"
              title="GROWTH"
              subtitle="In the past 7days"
            >
              <div className="space-y-2">
                <div className="text-4xl font-bold">8.9%</div>
                <MiniBars 
                  data={growthData}
                  color="rgb(var(--chart-5))"
                  height={80}
                  barWidth={32}
                  barGap={8}
                />
              </div>
            </DataTile>

            {/* Performance - Metric Only */}
            <DataTile
              variant="surface"
              title="PERFORMANCE"
              subtitle=""
            >
              <div className="flex items-center gap-3 py-8">
                <div className="text-6xl font-bold text-[rgb(var(--chart-3))]">98.9k</div>
                <div className="text-4xl">📈</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">In the past 7 days</p>
            </DataTile>

            {/* For More - Add Item */}
            <DataTile
              variant="ink"
              title="FOR MORE"
              subtitle=""
              action={
                <Button 
                  size="sm" 
                  className="rounded-full h-8 w-8 p-0"
                >
                  +
                </Button>
              }
            >
              <div className="flex items-center justify-center py-16">
                <div className="text-5xl font-bold text-[rgb(var(--chart-4))]">+Add Item</div>
              </div>
            </DataTile>
          </div>

          <div className="mt-8 rounded-lg bg-white/5 p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Bento Style Notes</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>• <strong className="text-white">Canvas:</strong> Pure black (#000000) with generous padding</li>
              <li>• <strong className="text-white">Tiles:</strong> 28px radius, 24px padding, soft shadows</li>
              <li>• <strong className="text-white">Surfaces:</strong> White, tinted (blue/violet), deep emerald, ink</li>
              <li>• <strong className="text-white">Typography:</strong> Uppercase titles, large metrics, minimal labels</li>
              <li>• <strong className="text-white">Interactions:</strong> All action pills use Layer 1 brand color (Salt Blue)</li>
              <li>• <strong className="text-white">Charts:</strong> Minimal axes, no grids, rounded caps, Layer 2 colors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

