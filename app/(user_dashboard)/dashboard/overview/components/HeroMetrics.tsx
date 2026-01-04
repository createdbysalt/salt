import { StatCard, StatGrid } from "@/components/patterns/stat-card";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

interface HeroMetricsProps {
  mrr: number;
  pipeline: number;
  thisMonth: number;
}

export function HeroMetrics({ mrr, pipeline, thisMonth }: HeroMetricsProps) {
  return (
    <StatGrid columns={3}>
      <StatCard
        title="Active Revenue"
        value={`$${(mrr / 1000).toFixed(1)}k`}
        description="Monthly recurring"
        icon={DollarSign}
      />
      <StatCard
        title="Pipeline"
        value={`$${(pipeline / 1000).toFixed(1)}k`}
        description="Active one-time projects"
        icon={TrendingUp}
      />
      <StatCard
        title="This Month"
        value={`$${(thisMonth / 1000).toFixed(1)}k`}
        description="Revenue collected"
        icon={Calendar}
      />
    </StatGrid>
  );
}


