import { MetricsStrip, type Metric } from "@/app/_features/memory/components/MetricsStrip";
import { ALL_TEAM, TEAM_MEMBERS } from "../workspace-data";

export function TeamsStatsStrip() {
  const active = ALL_TEAM.filter((m) => m.access === "active").length;
  const invited = ALL_TEAM.filter((m) => m.access === "invited").length;
  const routed = TEAM_MEMBERS.reduce((sum, m) => sum + m.playsRouted, 0);

  const metrics: Metric[] = [
    { label: "Members", value: String(ALL_TEAM.length) },
    { label: "Active", value: String(active), tone: "good" },
    { label: "Plays routed", value: String(routed), tone: routed ? "watch" : "default" },
    { label: "Pending invites", value: String(invited), tone: invited ? "watch" : "default" },
  ];

  return <MetricsStrip metrics={metrics} />;
}
