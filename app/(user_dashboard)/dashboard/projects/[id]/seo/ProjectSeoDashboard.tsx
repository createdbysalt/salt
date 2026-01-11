"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreGaugesGrid } from "@/components/seo/score-gauges";
import type { LighthouseScores } from "@/components/seo/score-gauges";
import { AuditBreakdown, type PageSpeedRawData } from "@/components/seo/audit-breakdown";
import { TrendsChart, type AuditDataPoint } from "@/components/seo/trends-chart";
import { VitalsCard } from "@/components/seo/vitals-card";
import { SeoAlertsSection } from "@/components/seo/seo-alerts";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Settings } from "lucide-react";
import { runAudit, getAudits } from "@/app/actions/seo";
import type { SeoConfig, SeoAuditRecord, CoreWebVitals, SeoAlertWithProject } from "@/app/actions/seo";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ProjectSeoDashboardProps {
  projectId: string;
  projectName: string;
  seoConfig: SeoConfig | null;
  initialAudit: SeoAuditRecord | null;
  auditHistory: SeoAuditRecord[];
  initialCrux: CoreWebVitals | null;
  alerts: SeoAlertWithProject[];
}

export function ProjectSeoDashboard({
  projectId,
  projectName,
  seoConfig,
  initialAudit,
  auditHistory,
  initialCrux,
  alerts,
}: ProjectSeoDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [currentAudit, setCurrentAudit] = useState<SeoAuditRecord | null>(initialAudit);
  const [currentAuditHistory, setCurrentAuditHistory] = useState<SeoAuditRecord[]>(auditHistory);
  const [currentCrux, setCurrentCrux] = useState<CoreWebVitals | null>(initialCrux);
  const [cruxFetched, setCruxFetched] = useState(initialCrux !== null);
  const { toast } = useToast();

  const handleRunAudit = () => {
    startTransition(async () => {
      const result = await runAudit({ projectId });

      if (result.ok) {
        // Fetch the full Lighthouse audit with raw_data for breakdown display
        const auditsResult = await getAudits({
          projectId,
          limit: 1,
          includeRawData: true,
          auditType: "lighthouse",
        });
        if (auditsResult.ok && auditsResult.data.audits.length > 0) {
          setCurrentAudit(auditsResult.data.audits[0]);
        } else {
          // Fallback to basic audit data if fetch fails
          setCurrentAudit({
            id: result.data.lighthouse.id,
            projectId: result.data.lighthouse.projectId,
            studioId: result.data.lighthouse.studioId,
            auditType: result.data.lighthouse.auditType,
            scores: result.data.lighthouse.scores,
            auditedAt: result.data.lighthouse.auditedAt,
            createdAt: result.data.lighthouse.createdAt,
          });
        }
        // Update audit history for trends chart
        const newAudit: SeoAuditRecord = {
          id: result.data.lighthouse.id,
          projectId: result.data.lighthouse.projectId,
          studioId: result.data.lighthouse.studioId,
          auditType: result.data.lighthouse.auditType,
          scores: result.data.lighthouse.scores,
          auditedAt: result.data.lighthouse.auditedAt,
          createdAt: result.data.lighthouse.createdAt,
        };
        setCurrentAuditHistory((prev) => [newAudit, ...prev]);

        // Update CrUX data
        setCurrentCrux(result.data.crux);
        setCruxFetched(true);

        toast({
          title: "Audit Complete",
          description: "Your site has been audited successfully.",
        });
      } else {
        const errorMessage = "message" in result ? result.message : "Failed to run audit";
        toast({
          title: "Audit Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  // Not configured state
  if (!seoConfig || !seoConfig.domain || !seoConfig.isEnabled) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SEO Dashboard</CardTitle>
            <CardDescription>
              Monitor your site&apos;s Lighthouse performance and SEO metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">SEO Not Configured</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {!seoConfig || !seoConfig.domain
                  ? "Add a domain in SEO settings to start monitoring your site's performance."
                  : "Enable SEO tracking in settings to start running audits."}
              </p>
              <Button asChild>
                <Link href={`/dashboard/projects/${projectId}/settings`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure SEO
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configured but no audit yet
  if (!currentAudit) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SEO Dashboard</CardTitle>
            <CardDescription>
              Monitoring {seoConfig.domain}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Audits Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Run your first Lighthouse audit to see performance, accessibility, best practices, and SEO scores.
              </p>
              <Button onClick={handleRunAudit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has audit data
  const scores: LighthouseScores = currentAudit.scores;
  const lastAuditedText = formatDistanceToNow(new Date(currentAudit.auditedAt), { addSuffix: true });
  const rawData = currentAudit.rawData as PageSpeedRawData | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>SEO Dashboard</CardTitle>
            <CardDescription>
              Monitoring {seoConfig.domain}
            </CardDescription>
          </div>
          <Button onClick={handleRunAudit} disabled={isPending} variant="outline">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Audit
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreGaugesGrid
            scores={scores}
            isLoading={isPending}
          />
          <div className="text-center text-sm text-muted-foreground">
            Last audited {lastAuditedText}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <SeoAlertsSection alerts={alerts} />

      {/* Core Web Vitals Section */}
      <VitalsCard
        vitals={currentCrux}
        isLoading={isPending}
        noTrafficData={cruxFetched && currentCrux === null}
      />

      {/* Trends Chart Section */}
      <TrendsChart
        audits={currentAuditHistory.map((audit) => ({
          auditedAt: audit.auditedAt,
          scores: audit.scores,
        }))}
        isLoading={isPending}
      />

      {/* Audit Breakdown Section */}
      <AuditBreakdown rawData={rawData ?? null} />
    </div>
  );
}
