"use client";

import { PortalStatus } from "./PortalStatus";
import { PreviewControls } from "./PreviewControls";
import { ClientActivity } from "./ClientActivity";

/**
 * Serve Mode Right Sidebar
 * Shows client portal management content:
 * - Portal Status: Current client's portal configuration
 * - Preview Controls: Device toggle for portal preview
 * - Client Activity: Recent views/downloads by clients
 */
export function ServeRightSidebar() {
  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      <div className="space-y-4">
        <PortalStatus />
        <PreviewControls />
        <ClientActivity />
      </div>
    </div>
  );
}
