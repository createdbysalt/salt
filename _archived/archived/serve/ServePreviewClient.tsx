"use client";

import { useEffect } from "react";
import { useServeClient } from "@/app/_features/shell/contexts/ServeClientContext";
import { usePreviewDevice } from "@/app/_features/portal/hooks/usePreviewDevice";
import {
  BridgePreviewFrame,
  BridgePreviewEmpty,
} from "@/app/_features/portal/components/BridgePreviewFrame";
import {
  ServeClientPicker,
  ServeClientPickerSkeleton,
} from "@/app/_features/portal/components/ServeClientPicker";
import { ServeQuickActions } from "@/app/_features/portal/components/ServeQuickActions";
import { ServePreviewControls } from "@/app/_features/portal/components/ServePreviewControls";
import { Card } from "@/app/_components/ui/card";

interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  lifecycle_stage?: string;
  company_name?: string | null;
}

interface ServePreviewClientProps {
  initialClients: Client[];
}

/**
 * ServePreviewClient - Main split-pane preview layout
 *
 * Layout:
 * - Left: Client picker (vertical list)
 * - Center: Live portal preview (iframe)
 * - Right: Quick actions
 * - Bottom: Device controls
 */
export function ServePreviewClient({ initialClients }: ServePreviewClientProps) {
  const {
    selectedClient,
    setSelectedClient,
    clients,
    setClients,
    isLoaded,
  } = useServeClient();

  const { device, setDevice, dimensions } = usePreviewDevice();

  // Initialize clients from server data and validate selected client
  useEffect(() => {
    const mappedClients = initialClients.map((c) => ({
      id: c.id,
      name: c.name,
      contactEmail: c.contact_email,
    }));

    setClients(mappedClients);

    // If selectedClient exists but isn't in the available clients, clear it
    if (selectedClient && initialClients.length > 0) {
      const clientExists = initialClients.some((c) => c.id === selectedClient.id);
      if (!clientExists) {
        setSelectedClient(null);
      }
    }

    // If there are no clients at all, clear any stale selection
    if (initialClients.length === 0 && selectedClient) {
      setSelectedClient(null);
    }
  }, [initialClients, setClients, selectedClient, setSelectedClient]);

  // Format clients for picker
  const pickerClients = initialClients.map((c) => ({
    id: c.id,
    name: c.name,
    contactEmail: c.contact_email,
    lifecycleStage: c.lifecycle_stage,
    companyName: c.company_name,
  }));

  // Handle client selection
  const handleSelectClient = (client: { id: string; name: string; contactEmail: string | null } | null) => {
    if (client) {
      setSelectedClient({
        id: client.id,
        name: client.name,
        contactEmail: client.contactEmail,
      });
    } else {
      setSelectedClient(null);
    }
  };

  // Handle exit preview
  const handleExitPreview = () => {
    setSelectedClient(null);
  };

  // Handle open in new tab
  const handleOpenNewTab = () => {
    window.open("/bridge", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Main Split Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Client Picker */}
        <Card className="w-72 shrink-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Clients</h2>
          </div>
          {!isLoaded ? (
            <ServeClientPickerSkeleton />
          ) : (
            <ServeClientPicker
              clients={pickerClients}
              selectedClientId={selectedClient?.id ?? null}
              onSelectClient={handleSelectClient}
              className="flex-1"
            />
          )}
        </Card>

        {/* Center: Preview Frame */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <Card className="flex-1 overflow-hidden">
            {selectedClient ? (
              <BridgePreviewFrame
                clientId={selectedClient.id}
                clientName={selectedClient.name}
                device={device}
                dimensions={dimensions}
                onExitPreview={handleExitPreview}
              />
            ) : (
              <BridgePreviewEmpty />
            )}
          </Card>

          {/* Device Controls */}
          <ServePreviewControls
            device={device}
            onDeviceChange={setDevice}
            onOpenNewTab={handleOpenNewTab}
            disabled={!selectedClient}
          />
        </div>

        {/* Right: Quick Actions */}
        <Card className="w-56 shrink-0 overflow-hidden hidden lg:flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Quick Actions</h2>
          </div>
          <ServeQuickActions
            clientId={selectedClient?.id ?? null}
            clientEmail={selectedClient?.contactEmail ?? null}
            className="flex-1"
          />
        </Card>
      </div>
    </div>
  );
}
