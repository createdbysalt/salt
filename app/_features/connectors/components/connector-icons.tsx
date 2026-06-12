import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledocs,
  SiGoogledrive,
  SiGooglesheets,
  SiGoogleslides,
  SiStripe,
} from "@icons-pack/react-simple-icons";
import { Plug } from "lucide-react";
import type { ConnectorCatalogId } from "../types";

export interface ConnectorIconMeta {
  Icon: React.ComponentType<{ className?: string; color?: string }>;
  color?: string;
}

/** Catalog ids without a branded icon yet fall back to a generic plug. */
export const FALLBACK_CONNECTOR_ICON: ConnectorIconMeta = { Icon: Plug };

export const CONNECTOR_ICONS: Partial<
  Record<ConnectorCatalogId, ConnectorIconMeta>
> = {
  google: { Icon: SiGmail, color: "#EA4335" },
  "google-calendar": { Icon: SiGooglecalendar, color: "#4285F4" },
  "google-drive": { Icon: SiGoogledrive, color: "#4285F4" },
  "google-docs": { Icon: SiGoogledocs, color: "#4285F4" },
  "google-sheets": { Icon: SiGooglesheets, color: "#34A853" },
  "google-slides": { Icon: SiGoogleslides, color: "#FBBC04" },
  stripe: { Icon: SiStripe, color: "#635BFF" },
};

export function getConnectorIcon(id: ConnectorCatalogId): ConnectorIconMeta {
  return CONNECTOR_ICONS[id] ?? FALLBACK_CONNECTOR_ICON;
}
