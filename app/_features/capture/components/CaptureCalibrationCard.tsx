"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
} from "@repo/ui";
import { Loader2, TrendingUp, Eye, XCircle, CheckCircle, Zap } from "lucide-react";

interface CalibrationMetrics {
  totalDecisions: number;
  byTier: {
    create: { count: number; approved: number; rejected: number; ignored: number };
    watch: { count: number; graduated: number; expired: number };
    nothing: { count: number };
  };
  approvalRate: number | null;
  graduationRate: number | null;
  signalEffectiveness: { signal: string; approvalRate: number; count: number }[];
}

interface Props {
  workspaceId: string;
}

export function CaptureCalibrationCard({ workspaceId }: Props) {
  const [metrics, setMetrics] = useState<CalibrationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`/api/capture/calibration?workspace_id=${workspaceId}&days=30`);
        if (!res.ok) throw new Error("Failed to fetch calibration metrics");
        const data = await res.json();
        setMetrics(data.metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [workspaceId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error ?? "No calibration data available"}
        </CardContent>
      </Card>
    );
  }

  const approvalPct = metrics.approvalRate !== null ? Math.round(metrics.approvalRate * 100) : null;
  const graduationPct = metrics.graduationRate !== null ? Math.round(metrics.graduationRate * 100) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Capture Calibration
        </CardTitle>
        <CardDescription>Last 30 days • {metrics.totalDecisions} decisions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <TierStat
            icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
            label="CREATE"
            count={metrics.byTier.create.count}
            sublabel={approvalPct !== null ? `${approvalPct}% approved` : "No outcomes yet"}
          />
          <TierStat
            icon={<Eye className="h-4 w-4 text-amber-500" />}
            label="WATCH"
            count={metrics.byTier.watch.count}
            sublabel={graduationPct !== null ? `${graduationPct}% graduated` : "No outcomes yet"}
          />
          <TierStat
            icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
            label="NOTHING"
            count={metrics.byTier.nothing.count}
            sublabel="Dropped"
          />
        </div>

        {/* Approval rate progress */}
        {approvalPct !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approval Rate</span>
              <span className="font-medium">{approvalPct}%</span>
            </div>
            <Progress value={approvalPct} className="h-2" />
            {approvalPct >= 90 && metrics.byTier.create.count >= 50 && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <Zap className="h-3 w-3" />
                Auto-apply eligible
              </div>
            )}
          </div>
        )}

        {/* Top signals */}
        {metrics.signalEffectiveness.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Signals</h4>
            <div className="flex flex-wrap gap-2">
              {metrics.signalEffectiveness.slice(0, 5).map((signal) => (
                <Badge key={signal.signal} variant="secondary" className="text-xs">
                  {formatSignal(signal.signal)} ({Math.round(signal.approvalRate * 100)}%)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierStat({
  icon,
  label,
  count,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  sublabel: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </div>
  );
}

function formatSignal(signal: string): string {
  return signal
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
