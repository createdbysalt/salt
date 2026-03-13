"use client";

import { useState, useCallback } from "react";
import { ServeHeader } from "./_components/ServeHeader";
import { BridgePreviewShell, type DeviceMode } from "./_components/BridgePreviewShell";
import { useServeClientSafe } from "@/app/_features/shell/hooks/useServeClient";

export default function ServePage() {
  const { selectedClient } = useServeClientSafe();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  const handleRefresh = useCallback(() => {
    // TODO: Refresh the iframe when implemented
    console.log("Refresh preview");
  }, []);

  const handleOpenNewTab = useCallback(() => {
    const bridgeUrl = selectedClient
      ? `/bridge?client=${selectedClient.id}`
      : "/bridge";
    window.open(bridgeUrl, "_blank");
  }, [selectedClient]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <ServeHeader
        title="Bridge Preview"
        showPreviewControls
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        onRefresh={handleRefresh}
        onOpenNewTab={handleOpenNewTab}
      />
      <BridgePreviewShell deviceMode={deviceMode} />
    </div>
  );
}
