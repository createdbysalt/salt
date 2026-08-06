"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Shield,
  Plus,
  Trash2,
  Mail,
  Globe,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MinusCircle,
  RefreshCw,
  Plug,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { SettingsPage } from "../SettingsPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsCard } from "../SettingsCard";
import {
  getBlocklist,
  blockDomain,
  blockEmail,
  blockSenderPattern,
  unblock,
  type GetBlocklistResult,
} from "@/app/_features/capture/actions/blocklist";
import {
  getConnectorHealthReport,
  fixConnectorCapture,
} from "@/app/_features/capture/actions/connector-health";
import type { WorkspaceHealthReport, ConnectorHealthStatus } from "@/app/_features/capture/services/connector-health";
import { CaptureCalibrationCard } from "@/app/_features/capture/components/CaptureCalibrationCard";

interface CaptureSectionProps {
  workspaceId: string;
}

type BlocklistType = "domain" | "email" | "sender_pattern";

const TYPE_ICONS: Record<BlocklistType, typeof Mail> = {
  domain: Globe,
  email: Mail,
  sender_pattern: User,
};

const TYPE_LABELS: Record<BlocklistType, string> = {
  domain: "Domain",
  email: "Email",
  sender_pattern: "Sender Pattern",
};

const TYPE_PLACEHOLDERS: Record<BlocklistType, string> = {
  domain: "example.com",
  email: "spammer@example.com",
  sender_pattern: "^noreply.*$",
};

const TYPE_DESCRIPTIONS: Record<BlocklistType, string> = {
  domain: "Block all emails from this domain",
  email: "Block this specific email address",
  sender_pattern: "Block senders matching this regex pattern",
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  googlecalendar: "Google Calendar",
  googledrive: "Google Drive",
  stripe: "Stripe",
  cal: "Cal.com",
};

function ConnectorHealthBadge({ status }: { status: ConnectorHealthStatus }) {
  if (!status.connectionStatus.connected) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <MinusCircle className="h-3 w-3" />
        Not connected
      </Badge>
    );
  }
  if (!status.connectionStatus.captureEnabled) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <XCircle className="h-3 w-3" />
        Disabled
      </Badge>
    );
  }

  const isBackfillOnly = status.triggerStatus.triggersExpected === 0;
  const hasCaptures = status.captureStats.last7d > 0;
  const triggersHealthy = status.triggerStatus.healthy;

  // Backfill-only connectors (like Cal.com) are healthy if enabled
  if (isBackfillOnly) {
    return (
      <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50">
        <CheckCircle2 className="h-3 w-3" />
        Backfill only
      </Badge>
    );
  }

  // Real-time connectors need captures AND healthy triggers
  if (hasCaptures && triggersHealthy) {
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
        <CheckCircle2 className="h-3 w-3" />
        Healthy
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
      <AlertCircle className="h-3 w-3" />
      Needs attention
    </Badge>
  );
}

export function CaptureSection({ workspaceId }: CaptureSectionProps) {
  const [blocklist, setBlocklist] = useState<GetBlocklistResult | null>(null);
  const [healthReport, setHealthReport] = useState<WorkspaceHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<BlocklistType>("domain");
  const [newValue, setNewValue] = useState("");
  const [newReason, setNewReason] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixingProvider, setFixingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadBlocklist();
    loadHealthReport();
  }, []);

  async function loadHealthReport() {
    try {
      const result = await getConnectorHealthReport();
      if (result.success) {
        setHealthReport(result.report);
      }
    } catch {
      // Silent fail - health is optional
    } finally {
      setIsHealthLoading(false);
    }
  }

  function handleRefreshHealth() {
    setIsHealthLoading(true);
    loadHealthReport();
  }

  async function handleFixConnector(provider: string) {
    setFixingProvider(provider);
    try {
      const result = await fixConnectorCapture(provider);
      if (result.success) {
        toast.success(`Capture enabled for ${PROVIDER_LABELS[provider] ?? provider}`);
        await loadHealthReport();
      } else {
        toast.error(result.error || "Failed to fix connector");
      }
    } catch {
      toast.error("Failed to fix connector");
    } finally {
      setFixingProvider(null);
    }
  }

  async function loadBlocklist() {
    try {
      const data = await getBlocklist();
      setBlocklist(data);
    } catch {
      toast.error("Failed to load blocklist");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddEntry() {
    if (!newValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    startTransition(async () => {
      try {
        let result;
        const reason = newReason.trim() || undefined;

        switch (newType) {
          case "domain":
            result = await blockDomain(newValue.trim(), reason);
            break;
          case "email":
            result = await blockEmail(newValue.trim(), reason);
            break;
          case "sender_pattern":
            result = await blockSenderPattern(newValue.trim(), reason);
            break;
        }

        if (result.success) {
          toast.success(`Added ${TYPE_LABELS[newType].toLowerCase()} to blocklist`);
          setNewValue("");
          setNewReason("");
          setIsDialogOpen(false);
          await loadBlocklist();
        } else {
          toast.error(result.error || "Failed to add entry");
        }
      } catch {
        toast.error("Failed to add entry");
      }
    });
  }

  function handleRemoveEntry(entryId: string) {
    setDeletingId(entryId);
    startTransition(async () => {
      try {
        const result = await unblock(entryId);
        if (result.success) {
          toast.success("Removed from blocklist");
          await loadBlocklist();
        } else {
          toast.error(result.error || "Failed to remove entry");
        }
      } catch {
        toast.error("Failed to remove entry");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <SettingsPage title="Capture">
      <SettingsSection
        title="Connector Health"
        description="Check which connectors are actively producing captures."
      >
        <SettingsCard>
          {isHealthLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : healthReport ? (
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plug className="h-4 w-4" />
                    <span>
                      {healthReport.summary.healthy} of {healthReport.summary.total - healthReport.summary.notConnected} healthy
                    </span>
                  </div>
                  {healthReport.summary.unhealthy > 0 && (
                    <Badge variant="secondary" className="text-xs text-amber-600">
                      {healthReport.summary.unhealthy} need attention
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefreshHealth}
                  disabled={isHealthLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isHealthLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {healthReport.connectors.map((connector) => {
                  const needsAttention =
                    connector.connectionStatus.connected &&
                    connector.connectionStatus.captureEnabled &&
                    connector.triggerStatus.triggersExpected > 0 &&
                    (connector.captureStats.last7d === 0 || !connector.triggerStatus.healthy);
                  const needsEnable =
                    connector.connectionStatus.connected &&
                    !connector.connectionStatus.captureEnabled;

                  return (
                    <div
                      key={connector.provider}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {PROVIDER_LABELS[connector.provider] ?? connector.provider}
                        </span>
                        {connector.connectionStatus.connected && connector.connectionStatus.captureEnabled && (
                          <span className="text-xs text-muted-foreground">
                            {connector.captureStats.last24h} today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(needsAttention || needsEnable) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFixConnector(connector.provider)}
                            disabled={fixingProvider === connector.provider}
                            className="h-7 text-xs"
                          >
                            {fixingProvider === connector.provider ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Fix"
                            )}
                          </Button>
                        )}
                        <ConnectorHealthBadge status={connector} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {healthReport.summary.unhealthy > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800">
                    Click "Fix" to register triggers and enable capture for connectors that need attention.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Unable to load connector health</p>
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Blocklist"
        description="Block domains, emails, or sender patterns from appearing in your captures."
      >
        <SettingsCard>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{blocklist?.stats.totalEntries ?? 0} blocked</span>
                  </div>
                  {blocklist && blocklist.stats.totalEntries > 0 && (
                    <div className="flex gap-2">
                      {blocklist.stats.byType.domain > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {blocklist.stats.byType.domain} domains
                        </Badge>
                      )}
                      {blocklist.stats.byType.email > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {blocklist.stats.byType.email} emails
                        </Badge>
                      )}
                      {blocklist.stats.byType.sender_pattern > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {blocklist.stats.byType.sender_pattern} patterns
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to blocklist</DialogTitle>
                      <DialogDescription>
                        Block a domain, email address, or sender pattern from appearing in captures.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newType}
                          onValueChange={(v) => setNewType(v as BlocklistType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domain">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span>Domain</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="email">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>Email Address</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sender_pattern">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Sender Pattern (Regex)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {TYPE_DESCRIPTIONS[newType]}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Value</Label>
                        <Input
                          placeholder={TYPE_PLACEHOLDERS[newType]}
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Reason (optional)</Label>
                        <Input
                          placeholder="Why are you blocking this?"
                          value={newReason}
                          onChange={(e) => setNewReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddEntry} disabled={isPending}>
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Add to blocklist"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {blocklist && blocklist.entries.length > 0 ? (
                <div className="border rounded-lg divide-y">
                  {blocklist.entries.map((entry) => {
                    const Icon = TYPE_ICONS[entry.type];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-mono text-sm truncate">
                              {entry.value}
                            </p>
                            {entry.reason && (
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[entry.type]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveEntry(entry.id)}
                            disabled={deletingId === entry.id}
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No blocked entries yet</p>
                  <p className="text-xs mt-1">
                    Add domains or emails to filter out unwanted captures
                  </p>
                </div>
              )}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Calibration"
        description="Track proposal accuracy and unlock auto-apply when confidence is earned."
      >
        <CaptureCalibrationCard workspaceId={workspaceId} />
      </SettingsSection>

      <SettingsSection
        title="Coming soon"
        description="Additional capture settings are being developed."
      >
        <SettingsCard>
          <div className="space-y-3 p-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Capture source preferences by connector</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Inbox triage and routing rules</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Meeting and context capture defaults</span>
              </li>
            </ul>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}
