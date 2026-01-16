"use client";

import { StyleguideControls } from "./styleguide-controls";
import { ComponentSection } from "./component-section";
import { TokenSwatch } from "./token-swatch";
import { CopyButton } from "./copy-button";
import { colorTokenGroups, radiusTokens } from "../_data/tokens";
import { 
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Toaster } from "@/components/ui/toaster";
import { LineChart, BarChart } from "@/components/charts";
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Loader2, 
  Search,
  Settings,
  User,
  Mail,
  Bell,
  Home,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
} from "lucide-react";

export default function StyleGuideShell() {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      
      <StyleguideControls />
      <Toaster />
      
      <main id="main-content" className="container py-12 px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Introduction */}
          <div>
            <h1 className="text-3xl font-bold mb-4">Core UI Design System</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              The complete design system for Salt Core. Built on Tailwind CSS v4, shadcn/ui, and Radix UI primitives.
              Dashboard is dark-first, Bridge is light-first—all components are context-aware.
            </p>
          </div>

          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="foundations">Foundations</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="charts">Data Viz</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Foundations</CardTitle>
                    <CardDescription>Design tokens and primitives</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      <li>• Colors (40+ tokens)</li>
                      <li>• Typography (Geist Sans/Mono)</li>
                      <li>• Spacing system</li>
                      <li>• Border radius</li>
                      <li>• Shadows</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Components</CardTitle>
                    <CardDescription>shadcn/ui + Radix primitives</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      <li>• Buttons (6 variants)</li>
                      <li>• Badges (9 variants)</li>
                      <li>• Forms & inputs</li>
                      <li>• Cards & layouts</li>
                      <li>• Tabs, icons, skeleton</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Visualization</CardTitle>
                    <CardDescription>Chart color palette</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      <li>• 5-color palette</li>
                      <li>• Multi-series support</li>
                      <li>• Light/dark optimized</li>
                      <li>• Usage guidelines</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle>Context-Aware Theming</CardTitle>
                  <CardDescription>Dashboard vs Bridge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Dashboard</h3>
                      <p className="text-sm text-muted-foreground">
                        Dark-first design for power users. Data-dense interfaces with high contrast for extended use.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Bridge</h3>
                      <p className="text-sm text-muted-foreground">
                        Light-first design for clients. Brighter surfaces and clearer affordances for professional client portal.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>WCAG 2.1 Level AA Compliant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="success">95/100 Score</Badge>
                    <Badge variant="success">WCAG 2.1 AA</Badge>
                    <Badge variant="info">ADA Compliant</Badge>
                  </div>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Full keyboard navigation support</li>
                    <li>• Screen reader compatible (ARIA labels)</li>
                    <li>• Proper focus indicators</li>
                    <li>• Color contrast verified</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Foundations Tab */}
            <TabsContent value="foundations" className="space-y-8 mt-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Foundations</h2>
              <p className="text-muted-foreground">
                Core design tokens that define the visual language
              </p>
            </div>

            {/* Colors */}
            <ComponentSection 
              id="colors" 
              title="Colors" 
              description="CSS variables for consistent theming across light/dark modes and Dashboard/Bridge contexts"
            >
              {colorTokenGroups.map((group) => (
                <div key={group.name} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.tokens.map((token) => (
                      <TokenSwatch
                        key={token.variable}
                        name={token.name}
                        variable={token.variable}
                        usage={token.usage}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </ComponentSection>

            {/* Typography */}
            <ComponentSection 
              id="typography" 
              title="Typography" 
              description="Geist Sans and Geist Mono type scale"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">Font Families</h3>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-4">
                      <code className="text-sm">--font-sans</code>
                      <span className="font-sans">Geist Sans (400, 500, 600, 700)</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <code className="text-sm">--font-mono</code>
                      <span className="font-mono">Geist Mono</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">Heading Scale</h3>
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-5xl font-bold">Heading 1</h1>
                      <code className="text-xs text-muted-foreground">text-5xl font-bold</code>
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold">Heading 2</h2>
                      <code className="text-xs text-muted-foreground">text-4xl font-bold</code>
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold">Heading 3</h3>
                      <code className="text-xs text-muted-foreground">text-3xl font-semibold</code>
                    </div>
                    <div>
                      <h4 className="text-2xl font-semibold">Heading 4</h4>
                      <code className="text-xs text-muted-foreground">text-2xl font-semibold</code>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">Body Text</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-base">
                        Base text (16px). The quick brown fox jumps over the lazy dog.
                      </p>
                      <code className="text-xs text-muted-foreground">text-base</code>
                    </div>
                    <div>
                      <p className="text-sm">
                        Small text (14px). The quick brown fox jumps over the lazy dog.
                      </p>
                      <code className="text-xs text-muted-foreground">text-sm</code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Muted text (14px). The quick brown fox jumps over the lazy dog.
                      </p>
                      <code className="text-xs text-muted-foreground">text-sm text-muted-foreground</code>
                    </div>
                    <div>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                        Inline code (Geist Mono)
                      </code>
                      <code className="text-xs text-muted-foreground block mt-1">font-mono text-sm</code>
                    </div>
                  </div>
                </div>
              </div>
            </ComponentSection>

            {/* Spacing */}
            <ComponentSection 
              id="spacing" 
              title="Spacing" 
              description="Tailwind spacing scale (4px base unit)"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((space) => (
                    <div key={space} className="flex items-center gap-4">
                      <code className="text-sm font-mono w-16">{space}</code>
                      <div 
                        className="h-8 bg-primary/20 border-l-4 border-primary"
                        style={{ width: `${space * 4}px` }}
                      />
                      <span className="text-sm text-muted-foreground">{space * 4}px</span>
                    </div>
                  ))}
                </div>
              </div>
            </ComponentSection>

            {/* Border Radius */}
            <ComponentSection 
              id="radius" 
              title="Border Radius" 
              description="Shape tokens for consistent rounded corners"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {radiusTokens.map((token) => (
                  <div key={token.variable} className="space-y-2">
                    <div 
                      className="h-24 w-full bg-primary/20 border-2 border-primary"
                      style={{ borderRadius: `var(${token.variable})` }}
                    />
                    <div className="text-sm font-medium">{token.name}</div>
                    <code className="text-xs text-muted-foreground font-mono block">
                      {token.variable}
                    </code>
                    <div className="text-xs text-muted-foreground">{token.usage}</div>
                  </div>
                ))}
              </div>
            </ComponentSection>

            {/* Shadows */}
            <ComponentSection 
              id="shadows" 
              title="Shadows" 
              description="Elevation system for layered UI"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-card border border-border">
                  <div className="text-sm font-medium mb-2">Card Shadow</div>
                  <code className="text-xs text-muted-foreground">var(--shadow-card)</code>
                  <p className="text-xs text-muted-foreground mt-2">Default card elevation</p>
                </div>
                <div className="p-6 rounded-lg bg-card border border-border shadow-lg">
                  <div className="text-sm font-medium mb-2">Large Shadow</div>
                  <code className="text-xs text-muted-foreground">shadow-lg</code>
                  <p className="text-xs text-muted-foreground mt-2">Elevated elements (dialogs, popovers)</p>
                </div>
              </div>
            </ComponentSection>
          </div>
            </TabsContent>

            {/* Components Tab */}
            <TabsContent value="components" className="space-y-8 mt-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Components</h2>
              <p className="text-muted-foreground">
                shadcn/ui components built on Radix UI primitives
              </p>
            </div>

            {/* Buttons */}
            <ComponentSection 
              id="buttons" 
              title="Buttons" 
              description="Primary interactive elements with multiple variants and sizes"
            >
              <Tabs defaultValue="variants">
                <TabsList>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="sizes">Sizes</TabsTrigger>
                  <TabsTrigger value="states">States</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent value="variants" className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </TabsContent>

                <TabsContent value="sizes" className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button>Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="states" className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button>Default</Button>
                    <Button disabled>Disabled</Button>
                    <Button>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading
                    </Button>
                    <Button>
                      <Search className="mr-2 h-4 w-4" />
                      With Icon
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-muted-foreground">Button.tsx</span>
                      <CopyButton 
                        value={`import { Button } from "@/components/ui/button"\n\n<Button>Click me</Button>`}
                        label="Copy"
                      />
                    </div>
                    <pre className="text-foreground">
{`import { Button } from "@/components/ui/button"

<Button>Click me</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>`}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Guidelines */}
              <div className="mt-6 p-4 rounded-lg border-l-4 border-primary bg-primary/5">
                <h4 className="font-semibold mb-2">When to use</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Primary actions and CTAs</li>
                  <li>Form submissions</li>
                  <li>Navigation triggers</li>
                </ul>
              </div>
            </ComponentSection>

            {/* Badges */}
            <ComponentSection 
              id="badges" 
              title="Badges" 
              description="Status indicators and labels"
            >
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="destructive">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </ComponentSection>

            {/* Form Components */}
            <ComponentSection 
              id="forms" 
              title="Form Components" 
              description="Inputs, labels, and form controls"
            >
              <div className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Enter your name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Type your message here..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disabled">Disabled Input</Label>
                  <Input id="disabled" disabled placeholder="Disabled..." />
                </div>
              </div>
            </ComponentSection>

            {/* Cards */}
            <ComponentSection 
              id="cards" 
              title="Cards" 
              description="Flexible content containers"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description goes here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is the card content. It can contain any elements.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">Action</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Another Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">Feature enabled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-sm">Warning message</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ComponentSection>

            {/* Skeleton Loading */}
            <ComponentSection 
              id="skeleton" 
              title="Loading States" 
              description="Skeleton components for loading states"
            >
              <div className="space-y-4 max-w-md">
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
              </div>
            </ComponentSection>

            {/* Tabs */}
            <ComponentSection 
              id="tabs" 
              title="Tabs" 
              description="Organize content into tabbed sections"
            >
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList>
                  <TabsTrigger value="tab1">Overview</TabsTrigger>
                  <TabsTrigger value="tab2">Analytics</TabsTrigger>
                  <TabsTrigger value="tab3">Settings</TabsTrigger>
                  <TabsTrigger value="tab4" disabled>Disabled</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="space-y-4">
                  <h3 className="text-lg font-semibold">Overview</h3>
                  <p className="text-muted-foreground">
                    This is the overview tab content. Tabs help organize related information
                    into separate views that users can switch between.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{i * 100}</div>
                          <p className="text-xs text-muted-foreground">Metric {i}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tab2" className="space-y-4">
                  <h3 className="text-lg font-semibold">Analytics</h3>
                  <p className="text-muted-foreground">
                    Analytics tab content with data insights.
                  </p>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">+12% from last month</span>
                  </div>
                </TabsContent>
                <TabsContent value="tab3" className="space-y-4">
                  <h3 className="text-lg font-semibold">Settings</h3>
                  <p className="text-muted-foreground">Settings and configuration options.</p>
                  <div className="space-y-3 max-w-md">
                    <div className="flex items-center justify-between">
                      <Label>Email notifications</Label>
                      <Badge variant="success">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Two-factor auth</Label>
                      <Badge variant="outline">Disabled</Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 p-4 rounded-lg border-l-4 border-primary bg-primary/5">
                <h4 className="font-semibold mb-2">When to use</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Organize related content into logical sections</li>
                  <li>Reduce vertical scrolling in dense interfaces</li>
                  <li>Present multiple views of the same data</li>
                </ul>
              </div>
            </ComponentSection>

            {/* Icons */}
            <ComponentSection 
              id="icons" 
              title="Icons" 
              description="Lucide React icon library (commonly used)"
            >
              <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
                {[
                  { icon: Home, name: "Home" },
                  { icon: User, name: "User" },
                  { icon: Mail, name: "Mail" },
                  { icon: Bell, name: "Bell" },
                  { icon: Search, name: "Search" },
                  { icon: Settings, name: "Settings" },
                  { icon: CheckCircle, name: "CheckCircle" },
                  { icon: AlertCircle, name: "AlertCircle" },
                  { icon: Info, name: "Info" },
                  { icon: Loader2, name: "Loader2" },
                ].map(({ icon: Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2 group">
                    <div 
                      className="p-3 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors"
                      role="img"
                      aria-label={`${name} icon`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <code className="text-xs text-muted-foreground">{name}</code>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Import from: <code className="px-2 py-1 rounded bg-muted">lucide-react</code>
              </div>
            </ComponentSection>
          </div>
            </TabsContent>

            {/* Data Visualization Tab */}
            <TabsContent value="charts" className="space-y-8 mt-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Data Visualization</h2>
              <p className="text-muted-foreground">
                Live chart examples using the Core UI chart color palette
              </p>
            </div>

            {/* Chart Color Palette Reference */}
            <ComponentSection 
              id="chart-colors" 
              title="Chart Color Palette" 
              description="5-color palette for multi-series data (automatically cycles through colors)"
            >
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="space-y-2">
                    <div 
                      className="h-16 rounded-lg border border-border"
                      style={{ backgroundColor: `var(--chart-${num})` }}
                    />
                    <code className="text-xs text-muted-foreground block">--chart-{num}</code>
                    <CopyButton value={`var(--chart-${num})`} size="sm" variant="ghost" />
                  </div>
                ))}
              </div>
            </ComponentSection>

            {/* Live Chart Examples */}
            <ComponentSection 
              id="line-charts" 
              title="Line Charts" 
              description="Time-series and trend visualization"
            >
              <div className="space-y-8">
                {/* Multi-Series Line Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold">Multi-Series Line Chart</h3>
                      <p className="text-xs text-muted-foreground">Revenue vs Expenses over time</p>
                    </div>
                    <Badge variant="info">Live Example</Badge>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <LineChart
                        data={[
                          { month: "Jan", revenue: 4000, expenses: 2400 },
                          { month: "Feb", revenue: 3000, expenses: 1398 },
                          { month: "Mar", revenue: 2000, expenses: 9800 },
                          { month: "Apr", revenue: 2780, expenses: 3908 },
                          { month: "May", revenue: 1890, expenses: 4800 },
                          { month: "Jun", revenue: 2390, expenses: 3800 },
                        ]}
                        lines={[
                          { dataKey: "revenue", name: "Revenue" },
                          { dataKey: "expenses", name: "Expenses" },
                        ]}
                        xAxisKey="month"
                        height={300}
                      />
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground mt-2">
                    ↑ Each series automatically gets a distinct color from the chart palette (--chart-1, --chart-2, etc.)
                  </p>
                </div>

                {/* Single-Series Line Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold">Single-Series Line Chart</h3>
                      <p className="text-xs text-muted-foreground">Website traffic over time</p>
                    </div>
                    <Badge variant="info">Live Example</Badge>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <LineChart
                        data={[
                          { week: "Week 1", visitors: 1200 },
                          { week: "Week 2", visitors: 1900 },
                          { week: "Week 3", visitors: 1600 },
                          { week: "Week 4", visitors: 2400 },
                          { week: "Week 5", visitors: 2100 },
                          { week: "Week 6", visitors: 2800 },
                        ]}
                        lines={[
                          { dataKey: "visitors", name: "Visitors" },
                        ]}
                        xAxisKey="week"
                        height={250}
                      />
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground mt-2">
                    ↑ Single series uses --chart-1 by default
                  </p>
                </div>

                {/* Code Example */}
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-muted-foreground">LineChart.tsx</span>
                    <CopyButton 
                      value={`import { LineChart } from "@/components/charts";\n\n<LineChart\n  data={data}\n  lines={[\n    { dataKey: "revenue", name: "Revenue" },\n    { dataKey: "expenses", name: "Expenses" },\n  ]}\n  xAxisKey="month"\n  height={300}\n/>`}
                      label="Copy"
                    />
                  </div>
                  <pre className="text-foreground overflow-x-auto">
{`import { LineChart } from "@/components/charts";

<LineChart
  data={data}
  lines={[
    { dataKey: "revenue", name: "Revenue" },
    { dataKey: "expenses", name: "Expenses" },
  ]}
  xAxisKey="month"
  height={300}
/>`}
                  </pre>
                </div>
              </div>
            </ComponentSection>

            {/* Bar Charts */}
            <ComponentSection 
              id="bar-charts" 
              title="Bar Charts" 
              description="Categorical and comparison data"
            >
              <div className="space-y-8">
                {/* Single-Series Bar Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold">Single-Series Bar Chart</h3>
                      <p className="text-xs text-muted-foreground">Daily sales performance</p>
                    </div>
                    <Badge variant="info">Live Example</Badge>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <BarChart
                        data={[
                          { day: "Mon", sales: 120 },
                          { day: "Tue", sales: 210 },
                          { day: "Wed", sales: 180 },
                          { day: "Thu", sales: 240 },
                          { day: "Fri", sales: 200 },
                          { day: "Sat", sales: 150 },
                          { day: "Sun", sales: 90 },
                        ]}
                        bars={[{ dataKey: "sales", name: "Sales" }]}
                        xAxisKey="day"
                        height={300}
                      />
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground mt-2">
                    ↑ Single series uses --chart-1 by default
                  </p>
                </div>

                {/* Multi-Series Bar Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold">Multi-Series Bar Chart (Grouped)</h3>
                      <p className="text-xs text-muted-foreground">Current period vs previous period comparison</p>
                    </div>
                    <Badge variant="info">Live Example</Badge>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <BarChart
                        data={[
                          { category: "Product A", current: 120, previous: 80 },
                          { category: "Product B", current: 210, previous: 140 },
                          { category: "Product C", current: 180, previous: 160 },
                          { category: "Product D", current: 240, previous: 200 },
                          { category: "Product E", current: 190, previous: 150 },
                        ]}
                        bars={[
                          { dataKey: "current", name: "Current Period" },
                          { dataKey: "previous", name: "Previous Period" },
                        ]}
                        xAxisKey="category"
                        height={300}
                      />
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground mt-2">
                    ↑ Each series gets distinct colors: --chart-1 (current), --chart-2 (previous)
                  </p>
                </div>

                {/* Code Example */}
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-muted-foreground">BarChart.tsx</span>
                    <CopyButton 
                      value={`import { BarChart } from "@/components/charts";\n\n<BarChart\n  data={data}\n  bars={[\n    { dataKey: "current", name: "Current Period" },\n    { dataKey: "previous", name: "Previous Period" },\n  ]}\n  xAxisKey="category"\n  height={300}\n/>`}
                      label="Copy"
                    />
                  </div>
                  <pre className="text-foreground overflow-x-auto">
{`import { BarChart } from "@/components/charts";

<BarChart
  data={data}
  bars={[
    { dataKey: "current", name: "Current Period" },
    { dataKey: "previous", name: "Previous Period" },
  ]}
  xAxisKey="category"
  height={300}
/>`}
                  </pre>
                </div>
              </div>
            </ComponentSection>

            {/* Usage Guidelines */}
            <ComponentSection 
              id="chart-guidelines" 
              title="Chart Usage Guidelines" 
              description="Best practices for data visualization"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Do's */}
                  <div className="p-4 rounded-lg border-l-4 border-success bg-success/5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
                      Do: Use chart colors for data
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Use --chart-1 through --chart-5 for data series</li>
                      <li>Let charts auto-assign colors in sequence</li>
                      <li>Each series gets a distinct color automatically</li>
                      <li>Colors work in both light and dark modes</li>
                      <li>Maintain visual clarity across multiple datasets</li>
                    </ul>
                  </div>

                  {/* Don'ts */}
                  <div className="p-4 rounded-lg border-l-4 border-destructive bg-destructive/5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      Don't: Use brand colors for data
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Don't use --primary for all chart lines/bars</li>
                      <li>Don't mix chart colors with button/CTA colors</li>
                      <li>Avoid single-color charts for multi-series data</li>
                      <li>Don't override auto-assigned colors without reason</li>
                      <li>Don't use custom colors outside the palette</li>
                    </ul>
                  </div>
                </div>

                {/* Chart Types Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <CardTitle className="text-base">When to use Line Charts</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Time-series data (trends over time)</li>
                        <li>• Continuous data visualization</li>
                        <li>• Comparing multiple trends</li>
                        <li>• Showing patterns and fluctuations</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <CardTitle className="text-base">When to use Bar Charts</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Categorical data comparison</li>
                        <li>• Discrete data points</li>
                        <li>• Side-by-side comparisons</li>
                        <li>• Ranking or performance metrics</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ComponentSection>
          </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <Separator />
          <div className="text-center text-sm text-muted-foreground pb-12">
            <p>Core UI Design System • Development Only</p>
            <p className="mt-2">Salt Core Infrastructure Layer</p>
          </div>
        </div>
      </main>
    </div>
  );
}

