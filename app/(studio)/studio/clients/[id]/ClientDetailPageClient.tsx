"use client";

import { useState, useCallback, useEffect } from "react";
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
import {
  getClientContacts,
  addClientContact,
  sendBridgeInvite,
  resendBridgeInvite,
  revokeBridgeAccess,
  removeClientContact,
} from "@/app/actions/clients/client-contacts";
import {
  sendClientEmail,
  sendGroupClientEmail,
  getClientEmails,
  getClientGroupEmails,
  getClientActivityEvents,
  createClientActivityEvent,
  deleteMessage,
  markConversationAsRead,
  getUnreadCounts,
  getConversationPreviews,
  debugEmailState,
} from "@/app/actions/messaging/send-client-email";
import type { SentEmail, GroupEmail, ClientActivityEvent } from "@/app/actions/messaging/send-client-email";
import { createClient } from "@/app/_lib/supabase/client";
import { CommunicationTab } from "@/app/_features/clients/components/CommunicationTab";
import { BillingTab, FilesTab, PeopleTab, ProjectsTab } from "@/app/_features/clients/components";
import type { ClientContact, ContactRole } from "@/app/_features/clients/components";
import { TrackRecentVisit } from "@/app/_features/shell/components/TrackRecentVisit";
import type { Conversation } from "@/app/_features/messaging/components/ConversationListItem";
import type { ChatMessageData } from "@/app/_features/messaging/components/ChatMessage";
import type { MessageMode } from "@/app/_features/messaging/components/SmartComposer";

interface AttachmentData {
  file: File;
  /** If this file already exists in the Files tab, its ID (to avoid duplication) */
  existingFileId?: string;
}

interface SendMessageData {
  content: string;
  mode: MessageMode;
  attachments?: AttachmentData[];
  emailData?: {
    fromAccountId: string;
    recipientIds: string[];
    subject: string;
    replyToThreadId?: string;
  };
}

interface GmailAccountInfo {
  id: string;
  email: string;
  name: string;
}

interface ClientDetailPageClientProps {
  client: ClientDetail;
  activeTab: string;
  gmailConnected?: boolean;
  gmailAccount?: GmailAccountInfo | null;
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

export function ClientDetailPageClient({
  client,
  activeTab,
  gmailConnected = false,
  gmailAccount,
}: ClientDetailPageClientProps) {
  const router = useRouter();

  // =============================================================================
  // Client Contacts State
  // =============================================================================
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Fetch contacts on mount
  useEffect(() => {
    async function fetchContacts() {
      setIsLoadingContacts(true);
      const result = await getClientContacts(client.id);
      if (result.data) {
        setContacts(result.data);
      } else if (result.error) {
        console.error("Failed to fetch contacts:", result.error);
      }
      setIsLoadingContacts(false);
    }
    fetchContacts();
  }, [client.id]);

  // =============================================================================
  // Derive Bridge Status from Contacts
  // =============================================================================
  // Bridge status logic:
  // - "not_invited": No contacts have been invited
  // - "invited": Has pending invites but no active users
  // - "active": Has at least one active user
  // - "revoked": All users were revoked
  const deriveBridgeStatus = useCallback((): "not_invited" | "invited" | "active" | "expired" | "revoked" => {
    // Include primary contact in the check
    const allContacts = client.contactEmail
      ? [{ bridgeStatus: "not_invited" as const }, ...contacts]
      : contacts;

    if (allContacts.length === 0) return "not_invited";

    const activeUsers = allContacts.filter((c) => c.bridgeStatus === "active");
    const pendingUsers = allContacts.filter((c) => c.bridgeStatus === "pending");
    const revokedUsers = allContacts.filter((c) => c.bridgeStatus === "revoked");

    if (activeUsers.length > 0) return "active";
    if (pendingUsers.length > 0) return "invited";
    if (revokedUsers.length > 0) return "revoked";
    return "not_invited";
  }, [contacts, client.contactEmail]);

  const bridgeStatus = deriveBridgeStatus();

  // =============================================================================
  // Derive Conversations from Contacts
  // =============================================================================
  // Conversation logic:
  // - General channel always exists
  // - DMs appear for ALL contacts (admins and team members) regardless of Bridge status
  const deriveConversations = useCallback((): Conversation[] => {
    // Build all contacts list including synthetic primary contact if not in database
    const allContacts = [...contacts];

    // Add primary contact if they exist and aren't already in contacts
    if (client.contactEmail) {
      const primaryExists = contacts.some(
        (c) => c.email.toLowerCase() === client.contactEmail?.toLowerCase()
      );
      if (!primaryExists) {
        allContacts.unshift({
          id: "primary",
          name: client.contactName || client.contactEmail.split("@")[0],
          email: client.contactEmail,
          role: "admin" as const,
          bridgeStatus: "not_invited" as const,
          isPrimaryContact: true,
        });
      }
    }

    // Build members array for stacked avatars
    const members = allContacts.map((c) => ({
      name: c.name,
      avatarUrl: c.avatarUrl,
    }));

    const conversations: Conversation[] = [
      // General channel - always present with stacked member avatars
      {
        id: "general",
        type: "general",
        name: "General",
        memberCount: allContacts.length,
        members,
        lastMessagePreview: allContacts.length > 0 ? "Start a conversation..." : null,
        lastMessageAt: null,
        lastMessageIsFromMe: false,
        unreadCount: 0,
      },
    ];

    // Add DM for each contact (regardless of Bridge status)
    allContacts.forEach((contact) => {
      conversations.push({
        id: `dm-${contact.id}`,
        type: "direct",
        name: contact.name,
        avatarUrl: contact.avatarUrl,
        lastMessagePreview: null,
        lastMessageAt: null,
        lastMessageIsFromMe: false,
        unreadCount: 0,
      });
    });

    return conversations;
  }, [contacts, client.contactEmail, client.contactName]);

  // Track last message preview for each conversation
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, { preview: string; timestamp: Date; isFromMe: boolean }>
  >({});

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  // Unread counts for conversations
  const [unreadCounts, setUnreadCounts] = useState<{
    general: number;
    contacts: Record<string, number>;
  }>({ general: 0, contacts: {} });

  // Use derived conversations that update when contacts change, enriched with previews and unread counts
  const conversations = deriveConversations().map((conv) => {
    const preview = conversationPreviews[conv.id];

    // Get unread count for this conversation
    let unreadCount = 0;
    if (conv.type === "general") {
      unreadCount = unreadCounts.general;
      console.log("[Conversations] General unread:", unreadCount);
    } else {
      // DM - look up by contact email
      const contactId = conv.id.replace("dm-", "");
      // Find the contact to get their email
      const contact = contacts.find((c) => c.id === contactId);
      const email = contact?.email?.toLowerCase() ||
        (contactId === "primary" ? client.contactEmail?.toLowerCase() : null);
      if (email) {
        unreadCount = unreadCounts.contacts[email] || 0;
        if (unreadCount > 0) {
          console.log("[Conversations] DM unread for", email, ":", unreadCount, "available keys:", Object.keys(unreadCounts.contacts));
        }
      }
    }

    return {
      ...conv,
      unreadCount,
      ...(preview && {
        lastMessagePreview: preview.preview,
        lastMessageAt: preview.timestamp,
        lastMessageIsFromMe: preview.isFromMe,
      }),
    };
  });
  // Initialize to first conversation (matches CommunicationTab's default)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    () => conversations[0]?.id ?? null
  );

  // Build a lookup for contacts by ID to get email addresses
  const contactsById = useCallback(() => {
    const lookup: Record<string, { email: string; name: string }> = {};
    contacts.forEach((c) => {
      lookup[c.id] = { email: c.email, name: c.name };
    });
    // Include primary contact
    if (client.contactEmail) {
      lookup["primary"] = {
        email: client.contactEmail,
        name: client.contactName || client.contactEmail.split("@")[0],
      };
    }
    return lookup;
  }, [contacts, client.contactEmail, client.contactName]);

  // Get the selected recipient's email for filtering
  // Returns the email for DMs, or null for General (which has no emails yet)
  const getSelectedRecipientEmail = useCallback((conversationId: string | null): string | null => {
    if (!conversationId) return null;
    // DM conversations have ID like "dm-{contactId}"
    if (conversationId.startsWith("dm-")) {
      const contactId = conversationId.replace("dm-", "");
      return contactsById()[contactId]?.email || null;
    }
    // General conversation - return null to indicate no emails should load
    return null;
  }, [contactsById]);

  // Check if current conversation is a DM (has emails)
  const isDMConversation = useCallback((conversationId: string | null): boolean => {
    return conversationId?.startsWith("dm-") ?? false;
  }, []);

  // Helper to update conversation preview from messages
  const updateConversationPreview = useCallback((conversationId: string, messages: ChatMessageData[]) => {
    if (messages.length === 0) return;

    // Find the most recent non-system message
    const sortedMessages = [...messages]
      .filter((m) => !m.isSystemMessage && m.channel !== "system")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const lastMessage = sortedMessages[0];
    if (!lastMessage) return;

    // Truncate preview text
    const previewText = lastMessage.content.length > 50
      ? lastMessage.content.slice(0, 50) + "..."
      : lastMessage.content;

    setConversationPreviews((prev) => ({
      ...prev,
      [conversationId]: {
        preview: previewText,
        timestamp: lastMessage.createdAt,
        isFromMe: lastMessage.isFromMe,
      },
    }));
  }, []);

  // Load messages from database (emails for DM, group emails + activity for General)
  const loadMessages = useCallback(async (conversationId: string | null) => {
    setIsLoadingMessages(true);
    try {
      if (!isDMConversation(conversationId)) {
        // General channel: load group emails and activity events
        const [groupEmailsResult, activityResult] = await Promise.all([
          getClientGroupEmails({ clientId: client.id }),
          getClientActivityEvents({ clientId: client.id }),
        ]);

        const allMessages: ChatMessageData[] = [];

        // Add group emails (both outbound and inbound replies)
        if ("success" in groupEmailsResult && groupEmailsResult.data) {
          for (const groupEmail of groupEmailsResult.data) {
            const isOutbound = groupEmail.direction === "outbound";
            allMessages.push({
              id: groupEmail.id,
              content: groupEmail.content,
              createdAt: groupEmail.createdAt,
              isFromMe: isOutbound,
              senderName: groupEmail.senderName,
              senderEmail: groupEmail.senderEmail,
              channel: "email" as const,
              emailSubject: groupEmail.subject,
              // Outbound: show "All X contacts (names)", Inbound: show sender name
              recipientName: isOutbound
                ? `All ${groupEmail.recipientCount} contacts (${groupEmail.recipientNames.join(", ")})`
                : undefined,
              status: groupEmail.status,
              gmailThreadId: groupEmail.gmailThreadId,
              gmailMessageId: groupEmail.gmailMessageId,
              attachments: groupEmail.attachments,
            });
          }
        }

        // Add activity events as system messages
        if ("success" in activityResult && activityResult.data) {
          for (const event of activityResult.data) {
            const eventMessages = formatActivityEvent(event);
            if (eventMessages) {
              allMessages.push({
                id: event.id,
                content: eventMessages,
                createdAt: event.createdAt,
                isFromMe: false,
                isSystemMessage: true,
                channel: "system" as const,
              });
            }
          }
        }

        // Sort by creation time
        allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        setMessages(allMessages);
        // Update conversation preview
        if (conversationId) {
          updateConversationPreview(conversationId, allMessages);
        }
        return;
      }

      // DM conversation: load emails for specific recipient
      const recipientEmail = getSelectedRecipientEmail(conversationId);
      if (!recipientEmail) {
        setMessages([]);
        return;
      }

      const result = await getClientEmails({
        clientId: client.id,
        recipientEmail,
      });

      if ("error" in result) {
        console.error("Failed to load emails:", result.error);
        return;
      }

      // Convert to ChatMessageData format
      const loadedMessages: ChatMessageData[] = result.data.map((email) => ({
        id: email.id,
        content: email.content,
        createdAt: email.createdAt,
        isFromMe: email.direction === "outbound",
        senderName: email.senderName,
        senderEmail: email.senderEmail,
        channel: "email" as const,
        emailSubject: email.subject,
        recipientName: email.recipientName,
        status: email.status,
        readAt: email.readAt,
        gmailThreadId: email.gmailThreadId,
        gmailMessageId: email.gmailMessageId,
        attachments: email.attachments,
      }));

      setMessages(loadedMessages);
      // Update conversation preview
      if (conversationId) {
        updateConversationPreview(conversationId, loadedMessages);
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, [client.id, getSelectedRecipientEmail, isDMConversation, updateConversationPreview]);

  // Helper to format activity events into readable messages
  const formatActivityEvent = (event: ClientActivityEvent): string | null => {
    const data = event.eventData as Record<string, string>;
    switch (event.eventType) {
      case "contact_added":
        return `${event.actorName || "Someone"} added ${data.contactName || "a contact"} to this client`;
      case "contact_removed":
        return `${event.actorName || "Someone"} removed ${data.contactName || "a contact"} from this client`;
      case "contact_invited":
        return `${event.actorName || "Someone"} invited ${data.contactName || "a contact"} to Bridge`;
      case "contact_joined":
        return `${data.contactName || "A contact"} joined Bridge`;
      case "contact_access_revoked":
        return `${event.actorName || "Someone"} revoked Bridge access for ${data.contactName || "a contact"}`;
      case "stage_changed":
        return `${event.actorName || "Someone"} changed stage from ${data.fromStage || "unknown"} to ${data.toStage || "unknown"}`;
      default:
        return null;
    }
  };

  // Load messages on mount and when conversation changes
  useEffect(() => {
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  // Fetch unread counts function (defined before effects that use it)
  const fetchUnreadCounts = useCallback(async () => {
    const result = await getUnreadCounts(client.id);
    if ("success" in result) {
      setUnreadCounts(result.data);
    }
  }, [client.id]);

  // Fetch unread counts on mount
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // DEBUG: Dump email state on mount to understand unread issue
  useEffect(() => {
    debugEmailState(client.id).then((result) => {
      if ("success" in result) {
        console.log("=== CLIENT DEBUG: Unread emails ===");
        console.log(result.data.unreadEmails);
      }
    });
  }, [client.id]);

  // Mark conversation as read when selected (including initial mount)
  useEffect(() => {
    if (!selectedConversationId) return;

    const markAsRead = async () => {
      console.log("[Unread] Marking conversation as read:", selectedConversationId);

      if (selectedConversationId === "general") {
        const result = await markConversationAsRead({
          clientId: client.id,
          isGeneral: true,
        });
        console.log("[Unread] General mark result:", result);
      } else if (selectedConversationId.startsWith("dm-")) {
        const contactId = selectedConversationId.replace("dm-", "");
        const contactEmail = contactsById()[contactId]?.email;
        console.log("[Unread] DM contact:", contactId, "email:", contactEmail);
        if (contactEmail) {
          const result = await markConversationAsRead({
            clientId: client.id,
            contactEmail,
          });
          console.log("[Unread] DM mark result:", result);
          // Log debug data if available
          if ("_debug" in result) {
            console.log("[Unread] DEBUG:", result._debug);
          }
        }
      }
      // Refresh unread counts after marking as read
      const countsResult = await fetchUnreadCounts();
      console.log("[Unread] New counts after refresh:", unreadCounts);
    };

    markAsRead();
  }, [selectedConversationId, client.id, contactsById, fetchUnreadCounts]);

  // Fetch conversation previews on mount (so we don't show "No messages yet" for conversations with messages)
  useEffect(() => {
    const fetchPreviews = async () => {
      const result = await getConversationPreviews(client.id);
      if ("success" in result) {
        const newPreviews: Record<string, { preview: string; timestamp: Date; isFromMe: boolean }> = {};

        // Set General preview
        if (result.data.general) {
          newPreviews["general"] = result.data.general;
        }

        // Set DM previews - need to map contact emails to conversation IDs
        for (const [email, preview] of Object.entries(result.data.contacts)) {
          // Find the contact with this email
          const contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());
          if (contact) {
            newPreviews[`dm-${contact.id}`] = preview;
          } else if (client.contactEmail?.toLowerCase() === email.toLowerCase()) {
            // Primary contact
            newPreviews["dm-primary"] = preview;
          }
        }

        setConversationPreviews((prev) => ({ ...prev, ...newPreviews }));
      }
    };

    fetchPreviews();
  }, [client.id, contacts, client.contactEmail]);

  // Set up realtime subscription for new emails
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`client-emails-${client.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_emails",
          filter: `client_id=eq.${client.id}`,
        },
        (payload) => {
          // Add new email to messages
          const email = payload.new as {
            id: string;
            content: string;
            created_at: string;
            sender_name: string;
            sender_email: string;
            subject: string;
            recipient_name: string;
            recipient_email: string;
            status: string;
            read_at: string | null;
            direction: string;
            gmail_thread_id: string | null;
            gmail_message_id: string | null;
          };

          // Only show emails in DM conversations, never in General
          if (!isDMConversation(selectedConversationId)) {
            return; // Skip emails in General channel
          }

          // Check if this email matches the selected DM conversation
          const recipientEmail = getSelectedRecipientEmail(selectedConversationId);
          if (!recipientEmail) {
            return;
          }
          // Check if this email belongs to the selected conversation
          // For outbound: recipient_email matches
          // For inbound: sender_email matches (client replied)
          const isForConversation =
            email.recipient_email === recipientEmail ||
            email.sender_email === recipientEmail;
          if (!isForConversation) {
            return; // Skip if not for selected conversation
          }

          const newMessage: ChatMessageData = {
            id: email.id,
            content: email.content,
            createdAt: new Date(email.created_at),
            isFromMe: email.direction === "outbound",
            senderName: email.sender_name,
            senderEmail: email.sender_email,
            channel: "email",
            emailSubject: email.subject,
            recipientName: email.recipient_name,
            status: email.status as "sending" | "sent" | "delivered" | "read" | "failed",
            readAt: email.read_at ? new Date(email.read_at) : null,
            gmailThreadId: email.gmail_thread_id || undefined,
            gmailMessageId: email.gmail_message_id || undefined,
          };

          // Only add if not already in messages (avoid duplicates)
          setMessages((prev) => {
            if (prev.some((m) => m.id === email.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          // Update conversation preview
          if (selectedConversationId) {
            updateConversationPreview(selectedConversationId, [newMessage]);
          }

          // Refresh unread counts when new inbound email arrives
          if (email.direction === "inbound") {
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client.id, selectedConversationId, getSelectedRecipientEmail, isDMConversation, updateConversationPreview, fetchUnreadCounts]);

  // Convert File to base64, preserving existingFileId if provided
  const fileToBase64 = useCallback(async (attachment: AttachmentData): Promise<{ filename: string; mimeType: string; content: string; existingFileId?: string }> => {
    const { file, existingFileId } = attachment;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1]; // Remove data:...;base64, prefix
        resolve({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          content: base64,
          existingFileId, // Pass through to avoid duplicating in Files tab
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleSendMessage = useCallback(
    async (data: SendMessageData) => {
      if (data.mode === "email" && data.emailData) {
        // Email mode - send via Gmail
        const recipientIds = data.emailData.recipientIds;
        const contactsLookup = contactsById();

        // Validate all recipients exist
        const recipientInfos = recipientIds.map((id) => ({
          id,
          ...contactsLookup[id],
        })).filter((r) => r.email);

        if (recipientInfos.length === 0) {
          toast.error("No valid recipients found");
          return { error: "No valid recipients found" };
        }

        // Convert attachments to base64 once (reuse for all recipients)
        let attachments: { filename: string; mimeType: string; content: string; existingFileId?: string }[] | undefined;
        console.log("[handleSendMessage] data.attachments:", data.attachments?.length || 0, data.attachments);
        if (data.attachments && data.attachments.length > 0) {
          try {
            attachments = await Promise.all(data.attachments.map(fileToBase64));
            console.log("[handleSendMessage] Converted attachments to base64:", attachments?.length, attachments?.map(a => ({ filename: a.filename, mimeType: a.mimeType, contentLength: a.content.length })));
          } catch (err) {
            console.error("Failed to process attachments:", err);
            toast.error("Failed to process attachments");
            return { error: "Failed to process attachments" };
          }
        }

        // Check if this is a group email (multiple recipients from General channel)
        const isGroupEmail = recipientIds.length > 1;

        if (isGroupEmail) {
          // Generate a group ID to link all emails together
          const groupId = crypto.randomUUID();

          // Send ONE email with all recipients in the To field
          const result = await sendGroupClientEmail({
            clientId: client.id,
            recipients: recipientInfos.map((r) => ({
              email: r.email,
              name: r.name,
            })),
            subject: data.emailData!.subject,
            content: data.content,
            attachments,
            groupId,
          });

          if ("error" in result) {
            toast.error(result.error);
            return { error: result.error };
          }

          const attachmentText = attachments ? ` with ${attachments.length} attachment(s)` : "";
          toast.success(`Email sent to ${recipientInfos.length} contacts${attachmentText}`);

          // Add a consolidated message to General chat showing the group email was sent
          const recipientNames = recipientInfos.map((r) => r.name).join(", ");

          // Build attachments array for UI display
          const messageAttachments = data.attachments?.map((att) => ({
            id: crypto.randomUUID(), // Temporary ID until page refresh loads DB records
            fileName: att.file.name,
            mimeType: att.file.type || null,
            sizeBytes: att.file.size,
          }));

          const newMessage: ChatMessageData = {
            id: result.data.id,
            content: data.content,
            createdAt: result.data.sentAt,
            isFromMe: true,
            senderName: result.data.senderName,
            senderAvatarUrl: result.data.senderAvatarUrl,
            channel: "email",
            emailSubject: data.emailData!.subject,
            gmailThreadId: result.data.gmailThreadId,
            recipientName: `All ${recipientInfos.length} contacts (${recipientNames})`,
            status: "delivered",
            attachments: messageAttachments,
          };
          // Add message if not already present (realtime might have added it first)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          // Update conversation preview
          updateConversationPreview("general", [newMessage]);

          return {};
        } else {
          // Single recipient (DM conversation)
          const recipientInfo = recipientInfos[0];

          // Use thread ID from emailData if provided (from UI thread selector)
          // This is the foolproof way - user explicitly selects which thread to reply to
          const replyToThreadId = data.emailData.replyToThreadId;

          console.log("[Thread Debug] Using threadId from UI:", replyToThreadId);
          console.log("[sendClientEmail] Calling with attachments:", attachments?.length || 0);

          const result = await sendClientEmail({
            clientId: client.id,
            recipientEmail: recipientInfo.email,
            recipientName: recipientInfo.name,
            subject: data.emailData.subject,
            content: data.content,
            attachments,
            // Thread continuation - use the thread ID selected by user in UI
            replyToThreadId: replyToThreadId,
          });
          console.log("[sendClientEmail] Result:", result);

          if ("error" in result) {
            toast.error(result.error);
            return { error: result.error };
          }

          // Build attachments array for UI display
          const dmMessageAttachments = data.attachments?.map((att) => ({
            id: crypto.randomUUID(), // Temporary ID until page refresh loads DB records
            fileName: att.file.name,
            mimeType: att.file.type || null,
            sizeBytes: att.file.size,
          }));

          // Add sent email to chat history (for DM conversations)
          const newMessage: ChatMessageData = {
            id: result.data.id,
            content: data.content,
            createdAt: result.data.sentAt,
            isFromMe: true,
            senderName: result.data.senderName,
            senderAvatarUrl: result.data.senderAvatarUrl,
            channel: "email",
            emailSubject: data.emailData.subject,
            recipientName: recipientInfo.name,
            status: "delivered",
            gmailThreadId: result.data.gmailThreadId,
            gmailMessageId: result.data.gmailMessageId,
            attachments: dmMessageAttachments,
          };

          // Add message if not already present (realtime might have added it first)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          // Update conversation preview
          const dmConversationId = `dm-${recipientInfo.id}`;
          updateConversationPreview(dmConversationId, [newMessage]);
          toast.success(attachments ? `Email sent with ${attachments.length} attachment(s)` : "Email sent");
          return {};
        }
      } else {
        // Bridge message mode - not yet implemented
        toast.info("Bridge messaging coming soon");
        return {};
      }
    },
    [client.id, contactsById, fileToBase64, updateConversationPreview, messages]
  );

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    // Messages will reload via the useEffect that depends on selectedConversationId
    // Marking as read is handled by the useEffect that watches selectedConversationId
  }, []);

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForEveryone: boolean) => {
      // Determine message type based on current conversation
      // For now, we only have email support (Bridge messages not yet implemented)
      const messageType = "email" as const;

      const result = await deleteMessage({
        messageId,
        messageType,
        deleteForEveryone,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // Remove the message from local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success(deleteForEveryone ? "Message deleted for everyone" : "Message removed from your view");
    },
    []
  );

  const handleInviteToBridge = useCallback(() => {
    // TODO: Implement Bridge invitation flow
    toast.info("Bridge invitation feature coming soon");
  }, []);

  const handleNewConversation = useCallback(() => {
    // TODO: Implement new DM conversation
    toast.info("New conversation feature coming soon");
  }, []);

  const handleClearChat = useCallback((conversationId: string) => {
    // TODO: Implement clear chat functionality
    console.log("[handleClearChat] Clearing chat:", conversationId);
    toast.info("Clear chat feature coming soon");
  }, []);

  const handleEditContact = useCallback((contactId: string) => {
    // Navigate to People tab to edit the contact
    console.log("[handleEditContact] Navigating to People tab for contact:", contactId);
    router.push(`/studio/clients/${client.id}?tab=people`);
    toast.info(`Edit contact in the People tab`);
  }, [router, client.id]);

  // =============================================================================
  // People Tab Handlers
  // =============================================================================
  const refreshContacts = useCallback(async () => {
    const result = await getClientContacts(client.id);
    if (result.data) {
      setContacts(result.data);
    }
  }, [client.id]);

  const handleAddPerson = useCallback(
    async (data: { name: string; email: string; role: ContactRole; sendInvite: boolean }) => {
      const result = await addClientContact(client.id, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Create activity event for the addition
      await createClientActivityEvent({
        clientId: client.id,
        eventType: "contact_added",
        eventData: { contactName: data.name, contactEmail: data.email, role: data.role },
      });
      toast.success(result.message || "Person added");
      await refreshContacts();
    },
    [client.id, refreshContacts]
  );

  const handleEditPerson = useCallback(
    async (_id: string, _data: { name: string; email: string; role: ContactRole }) => {
      // TODO: Implement edit person via server action when endpoint is ready
      toast.success("Person updated");
    },
    []
  );

  const handleSendInvite = useCallback(async (contactId: string) => {
    // Handle synthetic primary contact - need to create in database first
    if (contactId === "primary" && client.contactEmail) {
      const contactName = client.contactName || client.contactEmail.split("@")[0];
      const result = await addClientContact(client.id, {
        name: contactName,
        email: client.contactEmail,
        role: "admin",
        sendInvite: true,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Create activity event
      await createClientActivityEvent({
        clientId: client.id,
        eventType: "contact_invited",
        eventData: { contactName, contactEmail: client.contactEmail },
      });
      toast.success(result.message || "Bridge invite sent");
      await refreshContacts();
      return;
    }

    // Find contact name for activity event
    const contact = contacts.find((c) => c.id === contactId);
    const result = await sendBridgeInvite(client.id, contactId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Create activity event
    if (contact) {
      await createClientActivityEvent({
        clientId: client.id,
        eventType: "contact_invited",
        eventData: { contactName: contact.name, contactEmail: contact.email },
      });
    }
    toast.success("Bridge invite sent");
    await refreshContacts();
  }, [client.id, client.contactEmail, client.contactName, contacts, refreshContacts]);

  const handleResendInvite = useCallback(async (contactId: string) => {
    const result = await resendBridgeInvite(client.id, contactId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation resent");
    await refreshContacts();
  }, [client.id, refreshContacts]);

  const handleRevokeAccess = useCallback(async (contactId: string) => {
    // Find contact name for activity event
    const contact = contacts.find((c) => c.id === contactId);
    const result = await revokeBridgeAccess(client.id, contactId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Create activity event
    if (contact) {
      await createClientActivityEvent({
        clientId: client.id,
        eventType: "contact_access_revoked",
        eventData: { contactName: contact.name },
      });
    }
    toast.success("Access revoked");
    await refreshContacts();
  }, [client.id, contacts, refreshContacts]);

  const handleRemovePerson = useCallback(async (contactId: string) => {
    // Find contact name for activity event before removing
    const contact = contacts.find((c) => c.id === contactId);
    const result = await removeClientContact(client.id, contactId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Create activity event
    if (contact) {
      await createClientActivityEvent({
        clientId: client.id,
        eventType: "contact_removed",
        eventData: { contactName: contact.name },
      });
    }
    toast.success("Person removed");
    await refreshContacts();
  }, [client.id, contacts, refreshContacts]);

  return (
    <>
      {/* Track this client visit for recents */}
      <TrackRecentVisit
        item={{
          id: client.id,
          type: "client",
          mode: "studio",
          label: client.name,
          href: `/studio/clients/${client.id}`,
          subtitle: client.companyName || undefined,
        }}
      />
      {activeTab === "profile" && <ProfileTab client={client} />}
      {activeTab === "communication" && (
        <div className="absolute inset-0">
          <CommunicationTab
            clientId={client.id}
            clientName={client.name}
            clientEmail={client.contactEmail || undefined}
            bridgeStatus={bridgeStatus}
            conversations={conversations}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onSelectConversation={handleSelectConversation}
            onInviteToBridge={handleInviteToBridge}
            onNewConversation={handleNewConversation}
            onClearChat={handleClearChat}
            onEditContact={handleEditContact}
            // Gmail integration
            gmailConnected={gmailConnected}
            gmailAccounts={gmailAccount ? [gmailAccount] : []}
            onConnectGmail={() => router.push("/settings?section=integrations")}
            // Contact capabilities - derived from contacts (include primary if not already there)
            contacts={(() => {
              const contactsList = contacts.map((c) => ({
                id: c.id,
                name: c.name,
                hasBridge: c.bridgeStatus === "active",
                hasEmail: Boolean(c.email),
                email: c.email,
              }));
              // Add primary contact if exists and not already in list
              if (client.contactEmail) {
                const primaryExists = contacts.some(
                  (c) => c.email.toLowerCase() === client.contactEmail?.toLowerCase()
                );
                if (!primaryExists) {
                  contactsList.unshift({
                    id: "primary",
                    name: client.contactName || client.contactEmail.split("@")[0],
                    hasBridge: false,
                    hasEmail: true,
                    email: client.contactEmail,
                  });
                }
              }
              return contactsList;
            })()}
            className="h-full"
          />
        </div>
      )}
      {activeTab === "meetings" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Meetings tab coming soon
        </div>
      )}
      {activeTab === "files" && (
        <FilesTab
          clientId={client.id}
          clientName={client.name}
        />
      )}
      {activeTab === "billing" && (
        <BillingTab
          clientId={client.id}
          clientName={client.name}
          className="flex-1"
        />
      )}
      {activeTab === "projects" && (
        <ProjectsTab
          clientId={client.id}
          clientName={client.name}
        />
      )}
      {activeTab === "people" && (
        <PeopleTab
          clientId={client.id}
          clientName={client.name}
          primaryContactName={client.contactName || undefined}
          primaryContactEmail={client.contactEmail || undefined}
          contacts={contacts}
          isLoading={isLoadingContacts}
          onAddPerson={handleAddPerson}
          onEditPerson={handleEditPerson}
          onSendInvite={handleSendInvite}
          onResendInvite={handleResendInvite}
          onRevokeAccess={handleRevokeAccess}
          onRemovePerson={handleRemovePerson}
        />
      )}
    </>
  );
}
