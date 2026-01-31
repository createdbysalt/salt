"use client";

import { useEffect } from "react";
import { useServeClientSafe } from "../../../hooks/useServeClient";

interface ServeClient {
  id: string;
  name: string;
  contactEmail: string | null;
}

interface ServeClientLoaderProps {
  clients: ServeClient[];
}

/**
 * ServeClientLoader - Loads clients into the ServeClientContext
 *
 * This component is rendered by the server with the clients data,
 * and syncs it to the client-side context for use throughout the app.
 */
export function ServeClientLoader({ clients }: ServeClientLoaderProps) {
  const { setClients } = useServeClientSafe();

  useEffect(() => {
    setClients(clients);
  }, [clients, setClients]);

  return null;
}
