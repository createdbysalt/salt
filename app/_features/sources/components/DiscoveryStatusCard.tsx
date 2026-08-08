import { formatDistanceToNow } from "date-fns";
import { UserSearch } from "lucide-react";
import type { CaptureDiscoveryStatus } from "@/app/_features/capture/queries";

/**
 * Discovery status — Sources plan 4.4.
 *
 * Makes the Lane B cadence explicit where the stream lives: Salt looks at
 * senders it doesn't recognize yet and promotes the ones with relationship
 * evidence. The cadence is named per plan ("Once a day on Starter") so the
 * surface never implies real-time discovery that the tier doesn't run.
 */
export function DiscoveryStatusCard({
  discovery,
}: {
  discovery: CaptureDiscoveryStatus;
}) {
  const cadence =
    discovery.tier === "starter" ? "Once a day" : "Four times a day";
  const next = new Date(discovery.nextRunAt);
  const nextLabel =
    next.getTime() <= Date.now()
      ? "with the next scheduled run"
      : formatDistanceToNow(next, { addSuffix: true });

  return (
    <section className="glass-card flex items-center gap-3 rounded-3xl px-5 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <UserSearch className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Discovery</p>
        <p className="text-[12px] text-muted-foreground">
          Salt checks senders it doesn&rsquo;t recognize yet and promotes the
          ones you&rsquo;ve replied to or met. {cadence} on{" "}
          {discovery.tierLabel} &middot; next check {nextLabel}.
        </p>
      </div>
    </section>
  );
}
