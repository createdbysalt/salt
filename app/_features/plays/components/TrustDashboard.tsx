import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { CheckCircle2, AlertTriangle, TrendingUp, History } from "lucide-react";
import { getCorrectionAnalytics } from "@/app/_lib/memory-tools";
import { memoryGetConflicts } from "@/app/_lib/memory-tools";
import { getTenantContext, requireWorkspaceMember } from "@/app/_lib/tenancy";
import { TrustMetricCard } from "./TrustMetricCard";
import { RecentCorrectionsList } from "./RecentCorrectionsList";
import { PatternAlertsList } from "./PatternAlertsList";
import { ConflictsList } from "./ConflictsList";

export async function TrustDashboard() {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const workspaceId = workspace.id;

  const [analytics, conflictsResult] = await Promise.all([
    getCorrectionAnalytics(workspaceId),
    memoryGetConflicts({ workspaceId }),
  ]);

  const totalAutoApplied = await getAutoAppliedCount(workspaceId);
  const accuracy = totalAutoApplied > 0
    ? Math.round(((totalAutoApplied - analytics.totalCorrections) / totalAutoApplied) * 100)
    : 100;

  return (
    <div className="space-y-8 mt-8">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <TrustMetricCard
          title="Accuracy"
          value={`${accuracy}%`}
          description="Auto-applied values not corrected"
          icon={<CheckCircle2 className="size-4 text-emerald-600" />}
          trend={accuracy >= 95 ? "up" : accuracy >= 85 ? "neutral" : "down"}
        />
        <TrustMetricCard
          title="Corrections"
          value={analytics.totalCorrections.toString()}
          description="In the last 30 days"
          icon={<History className="size-4 text-amber-600" />}
        />
        <TrustMetricCard
          title="Active Conflicts"
          value={conflictsResult.conflicts.length.toString()}
          description="Awaiting your decision"
          icon={<AlertTriangle className="size-4 text-orange-600" />}
          trend={conflictsResult.conflicts.length > 0 ? "attention" : "neutral"}
        />
        <TrustMetricCard
          title="Patterns Detected"
          value={analytics.patternsDetected.length.toString()}
          description="Rules to consider adjusting"
          icon={<TrendingUp className="size-4 text-blue-600" />}
        />
      </div>

      {/* Conflicts Section */}
      {conflictsResult.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-orange-600" />
              Needs Your Decision
            </CardTitle>
            <CardDescription>
              Salt found conflicting evidence for these fields. Pick the correct value.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConflictsList conflicts={conflictsResult.conflicts} />
          </CardContent>
        </Card>
      )}

      {/* Pattern Alerts */}
      {analytics.patternsDetected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-blue-600" />
              Threshold Recommendations
            </CardTitle>
            <CardDescription>
              These rules have been corrected frequently. Consider adjusting their thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatternAlertsList patterns={analytics.patternsDetected} />
          </CardContent>
        </Card>
      )}

      {/* Recent Corrections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            Recent Corrections
          </CardTitle>
          <CardDescription>
            Values you've corrected in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentCorrections.length > 0 ? (
            <RecentCorrectionsList corrections={analytics.recentCorrections} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No corrections in the last 30 days. Salt is learning well!
            </p>
          )}
        </CardContent>
      </Card>

      {/* By Field Breakdown */}
      {Object.keys(analytics.correctionsByField).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Corrections by Field</CardTitle>
            <CardDescription>
              Which fields get corrected most often
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analytics.correctionsByField)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([field, count]) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{field}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} correction{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function getAutoAppliedCount(workspaceId: string): Promise<number> {
  const { createAdminClient } = await import("@/app/_lib/supabase/admin");
  const admin = createAdminClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count } = await admin
    .from("profile_field_provenance")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "applied")
    .neq("source", "manual")
    .gte("set_at", thirtyDaysAgo.toISOString());

  return count ?? 0;
}
