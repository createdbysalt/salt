"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MinusCircle,
  RefreshCw,
  Plug,
} from "lucide-react";
import {
  Button,
  Badge,
} from "@repo/ui";
import { SettingsPage } from "../SettingsPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsCard } from "../SettingsCard";
import {
  getConnectorHealthReport,
  fixConnectorCapture,
} from "@/app/_features/capture/actions/connector-health";
import type { WorkspaceHealthReport, ConnectorHealthStatus } from "@/app/_features/capture/services/connector-health";
import { CaptureCalibrationCard } from "@/app/_features/capture/components/CaptureCalibrationCard";

// Blocklist management moved to Memory → Rules → Admission policy (2026-08-06).

interface CaptureSectionProps {
  workspaceId: string;
}

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
  const [healthReport, setHealthReport] = useState<WorkspaceHealthReport | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [fixingProvider, setFixingProvider] = useState<string | null>(null);

  useEffect(() => {
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
        title="Calibration"
        description="Track proposal accuracy and unlock auto-apply when confidence is earned."
      >
        <CaptureCalibrationCard workspaceId={workspaceId} />
      </SettingsSection>
    </SettingsPage>
  );
}
