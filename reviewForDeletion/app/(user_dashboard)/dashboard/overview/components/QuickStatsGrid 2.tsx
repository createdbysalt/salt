import { Card, CardContent } from "@/components/ui/card";
import { StatCard, StatGrid } from "@/components/patterns/stat-card";
import { FolderKanban, Users, DollarSign, Activity } from "lucide-react";

interface QuickStatsGridProps {
  activeCount: number;
  retainerCount: number;
  oneTimeCount: number;
  healthAverage: number;
  atRiskCount: number;
}

export function QuickStatsGrid({
  activeCount,
  retainerCount,
  oneTimeCount,
  healthAverage,
  atRiskCount,
}: QuickStatsGridProps) {
  return (
    <StatGrid columns={4}>
      <StatCard
        title="Active Projects"
        value={activeCount.toString()}
        description={`${retainerCount} retainer, ${oneTimeCount} one-time`}
        icon={FolderKanban}
      />
      <StatCard
        title="Client Health"
        value={`${healthAverage}/100`}
        description={atRiskCount > 0 ? `${atRiskCount} at risk` : "All healthy"}
        icon={Users}
      />
      <StatCard
        title="Effective Hourly"
        value="—"
        description="Not enough data yet"
        icon={DollarSign}
      />
      <StatCard
        title="Utilization"
        value="—"
        description="Not enough data yet"
        icon={Activity}
      />
    </StatGrid>
  );
}


