import {
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiStripe,
} from "@icons-pack/react-simple-icons";
import type { ConnectorCatalogId } from "../types";

export const CONNECTOR_ICONS: Record<
  ConnectorCatalogId,
  { Icon: React.ComponentType<{ className?: string; color?: string }>; color?: string }
> = {
  google: { Icon: SiGmail, color: "#EA4335" },
  "google-calendar": { Icon: SiGooglecalendar, color: "#4285F4" },
  "google-drive": { Icon: SiGoogledrive, color: "#4285F4" },
  stripe: { Icon: SiStripe, color: "#635BFF" },
};
