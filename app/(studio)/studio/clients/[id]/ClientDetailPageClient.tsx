"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { ChartConfig } from "@repo/ui";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PolarRadiusAxis,
  Label,
} from "recharts";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { updateClient } from "@/app/actions/clients/update-client";
import { updateClientLifecycleStage } from "@/app/actions/clients/update-client";
import type { ClientDetail } from "@/app/actions/clients/get-client";

interface ClientDetailPageClientProps {
  client: ClientDetail;
  activeTab: string;
}

// Settings-style components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card divide-y", className)}>
      {children}
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

// Lifecycle stages
const LIFECYCLE_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "discovery", label: "Discovery" },
  { value: "pitch", label: "Pitch" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
  { value: "lost", label: "Lost" },
] as const;

// Chart configurations
const activityChartConfig = {
  messages: { label: "Messages", color: "var(--primary)" },
  meetings: { label: "Meetings", color: "var(--primary)" },
} satisfies ChartConfig;

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "var(--primary)" },
} satisfies ChartConfig;

// Health chart config - uses primary color to match other charts
const healthChartConfig = {
  health: { label: "Health Score", color: "var(--primary)" },
} satisfies ChartConfig;

// Convert health factors to actionable improvement suggestions
function getImprovementSuggestion(factor: string): string {
  const suggestions: Record<string, string> = {
    "Last Contact": "Schedule a check-in",
    "Payment Status": "Follow up on invoices",
    "Support Volume": "Review support load",
    "Project Timeline": "Update milestones",
    "Meeting Presence": "Schedule a meeting",
    "Meeting Reliability": "Confirm meetings",
    "Active Retainer": "Retainer is active",
  };
  return suggestions[factor] || factor;
}

// Profile Tab Component
function ProfileTab({ client }: { client: ClientDetail }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(client.companyName || "");
  const [name, setName] = useState(client.name);
  const [contactName, setContactName] = useState(client.contactName || "");
  const [email, setEmail] = useState(client.contactEmail || "");
  const [phone, setPhone] = useState(client.contactPhone || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldSave = async (field: string, value: string) => {
    setIsSaving(true);
    const result = await updateClient({
      client_id: client.id,
      [field]: value,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Updated");
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleStageChange = async (stage: string) => {
    const result = await updateClientLifecycleStage(
      client.id,
      stage as typeof LIFECYCLE_STAGES[number]["value"]
    );

    if (!result.success) {
      toast.error(result.error || "Failed to update stage");
    } else {
      toast.success("Stage updated");
      router.refresh();
    }
  };

  const getDaysInStage = () => {
    if (!client.stageEnteredAt) return 0;
    const entered = new Date(client.stageEnteredAt);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Use real client data for charts
  const activityData = client.activityData;
  const revenueData = client.revenueData;

  // Health chart data - single value that fills proportionally
  const healthChartData = [
    { name: "health", value: client.healthScore, fill: "var(--color-health)" },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-10 space-y-8">
        {/* Charts Row - At the Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Health Score Card with Radial Chart */}
          <ShadcnCard className="relative overflow-hidden">
            <CardHeader className="px-4 pt-3 pb-0 relative z-10">
              <CardDescription>Client Health</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {client.healthScore >= 80
                  ? "Healthy"
                  : client.healthScore >= 50
                  ? "Needs Attention"
                  : "At Risk"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-2 pb-3 relative z-10">
              {/* Health Improvement Suggestions */}
              {client.healthFactors.filter(f => f.impact < 0).length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  <p className="text-muted-foreground font-medium">To improve:</p>
                  {client.healthFactors
                    .filter((f) => f.impact < 0)
                    .slice(0, 2)
                    .map((factor, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-foreground">
                          {getImprovementSuggestion(factor.factor)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Looking good!</p>
              )}
            </CardContent>
            {/* Right side - Radial Chart (absolutely positioned) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <ChartContainer config={healthChartConfig} className="aspect-square w-[160px]">
                <RadialBarChart
                  data={healthChartData}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={58}
                  outerRadius={78}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background={{ fill: "hsl(var(--muted))" }}
                    dataKey="value"
                    angleAxisId={0}
                    cornerRadius={5}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {client.healthScore}%
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>
          </ShadcnCard>

          {/* Activity Chart */}
          <ShadcnCard>
            <CardHeader className="px-4 pt-3 pb-0">
              <CardDescription>Engagement Activity</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {activityData.reduce((sum, d) => sum + d.messages + d.meetings, 0)} interactions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-2 pb-3">
              <ChartContainer config={activityChartConfig} className="h-[100px] w-full">
                <BarChart data={activityData} barGap={2}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar
                    dataKey="messages"
                    fill="var(--color-messages)"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="meetings"
                    fill="var(--color-meetings)"
                    radius={[2, 2, 0, 0]}
                    opacity={0.6}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </ShadcnCard>

          {/* Revenue Chart */}
          <ShadcnCard>
            <CardHeader className="px-4 pt-3 pb-0">
              <CardDescription>Revenue</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums">
                {client.ltv > 0 ? `$${client.ltv.toLocaleString()}` : "$0"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-2 pb-3">
              <ChartContainer config={revenueChartConfig} className="h-[100px] w-full">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    fill="url(#fillRevenue)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </ShadcnCard>
        </div>

        {/* Client Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Info - Takes 2 columns */}
          <div className="md:col-span-2">
            <Section title="Client Details">
              <Card>
                <Row label="Company name">
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onBlur={() => handleFieldSave("company_name", companyName)}
                    className="w-64 text-right"
                    placeholder="Add company"
                    disabled={isSaving}
                  />
                </Row>
                <Row label="Client name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleFieldSave("name", name)}
                    className="w-64 text-right"
                    disabled={isSaving}
                  />
                </Row>
                <Row label="Contact person">
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    onBlur={() => handleFieldSave("contact_name", contactName)}
                    className="w-64 text-right"
                    placeholder="Add contact"
                    disabled={isSaving}
                  />
                </Row>
                <Row label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleFieldSave("contact_email", email)}
                    className="w-64 text-right"
                    placeholder="Add email"
                    disabled={isSaving}
                  />
                </Row>
                <Row label="Phone">
                  <div className="w-64">
                    <PhoneInput
                      value={phone}
                      onChange={(value) => setPhone(value || "")}
                      onBlur={() => handleFieldSave("contact_phone", phone)}
                      disabled={isSaving}
                    />
                  </div>
                </Row>
              </Card>
            </Section>
          </div>

          {/* Status & Tags */}
          <div className="flex flex-col gap-6">
            <Section title="Status">
              <Card>
                <Row label="Stage">
                  <Select value={client.lifecycleStage} onValueChange={handleStageChange}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Time in stage">
                  <span className="text-sm">{getDaysInStage()} days</span>
                </Row>
                <Row label="Client since">
                  <span className="text-sm">{formatDate(client.createdAt)}</span>
                </Row>
              </Card>
            </Section>

            {/* Tags - Below Status, grows to fill remaining space */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Tags</h2>
              <Card className="flex-1">
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {client.tags.length > 0 ? (
                      client.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="gap-1"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: `${tag.color}40`,
                          }}
                        >
                          {tag.label}
                          <button className="hover:bg-black/10 rounded-full p-0.5">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2">
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Notes */}
        <Section title="Internal Notes">
          <Card>
            <div className="p-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => handleFieldSave("notes", notes)}
                placeholder="Add internal notes about this client..."
                className="min-h-[120px] resize-none"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Notes are only visible to your team
              </p>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}

export function ClientDetailPageClient({ client, activeTab }: ClientDetailPageClientProps) {
  return (
    <>
      {activeTab === "profile" && <ProfileTab client={client} />}
      {activeTab === "communication" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Communication tab coming soon
        </div>
      )}
      {activeTab === "meetings" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Meetings tab coming soon
        </div>
      )}
      {activeTab === "files" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Files tab coming soon
        </div>
      )}
      {activeTab === "billing" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Billing tab coming soon
        </div>
      )}
      {activeTab === "projects" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Projects tab coming soon
        </div>
      )}
    </>
  );
}
