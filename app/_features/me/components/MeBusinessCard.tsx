"use client";

import { Building2, Globe, MapPin, Briefcase } from "lucide-react";
import type { OperatorBusiness } from "../types";

type MeBusinessCardProps = {
  business: OperatorBusiness;
};

export function MeBusinessCard({ business }: MeBusinessCardProps) {
  const activeServices = business.services.filter((s) => s.isActive);
  const hasServices = activeServices.length > 0;

  return (
    <section className="glass-card rounded-3xl p-6 lg:p-7">
      <header className="flex items-center gap-2 mb-4">
        <Building2 className="size-[18px]" strokeWidth={1.75} />
        <span className="chip">Your business</span>
      </header>

      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-foreground">
            {business.name || "Unnamed workspace"}
          </p>
          {business.tagline && (
            <p className="text-sm text-muted-foreground mt-0.5">{business.tagline}</p>
          )}
        </div>

        <div className="space-y-2">
          {business.websiteUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{business.websiteUrl.replace(/^https?:\/\//, "")}</span>
            </div>
          )}
          {business.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" strokeWidth={2} />
              <span>{business.location}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="size-3.5 text-muted-foreground" strokeWidth={2} />
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              Services
            </p>
          </div>
          {hasServices ? (
            <div className="flex flex-wrap gap-1.5">
              {activeServices.slice(0, 4).map((service) => (
                <span
                  key={service.id}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80"
                >
                  {service.name}
                </span>
              ))}
              {activeServices.length > 4 && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  +{activeServices.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No services configured</p>
          )}
        </div>
      </div>
    </section>
  );
}
