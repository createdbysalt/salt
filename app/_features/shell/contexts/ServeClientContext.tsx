"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface ServeClient {
  id: string;
  name: string;
  contactEmail: string | null;
}

interface ServeClientContextValue {
  selectedClient: ServeClient | null;
  setSelectedClient: (client: ServeClient | null) => void;
  clients: ServeClient[];
  setClients: (clients: ServeClient[]) => void;
  isLoaded: boolean;
  fetchClients: () => Promise<void>;
  isFetching: boolean;
}

const ServeClientContext = createContext<ServeClientContextValue | null>(null);

const STORAGE_KEY = "salt-serve-selected-client";

/**
 * Provider for Serve mode client selection
 * Persists selected client to localStorage
 * Clients are lazy-loaded on first access to avoid loading on every page
 */
export function ServeClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClientState] = useState<ServeClient | null>(
    null
  );
  const [clients, setClients] = useState<ServeClient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Lazy-load clients when needed
  const fetchClients = useCallback(async () => {
    if (hasFetched || isFetching) return;

    setIsFetching(true);
    try {
      const response = await fetch("/api/clients/list");
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error("Error fetching clients:", e);
    } finally {
      setIsFetching(false);
      setHasFetched(true);
    }
  }, [hasFetched, isFetching]);

  // Load persisted selection on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.name) {
          setSelectedClientState(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading serve client from localStorage:", e);
    }
    setIsLoaded(true);
  }, []);

  // Persist selection changes
  const setSelectedClient = useCallback((client: ServeClient | null) => {
    setSelectedClientState(client);
    try {
      if (client) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(client));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("Error saving serve client to localStorage:", e);
    }
  }, []);

  // Validate that selected client still exists in available clients
  useEffect(() => {
    if (isLoaded && selectedClient && clients.length > 0) {
      const clientExists = clients.some((c) => c.id === selectedClient.id);
      if (!clientExists) {
        // Client no longer available, clear selection
        setSelectedClient(null);
      }
    }
  }, [isLoaded, selectedClient, clients, setSelectedClient]);

  return (
    <ServeClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
        clients,
        setClients,
        isLoaded,
        fetchClients,
        isFetching,
      }}
    >
      {children}
    </ServeClientContext.Provider>
  );
}

/**
 * Hook to access serve client context
 * Must be used within ServeClientProvider
 */
export function useServeClient() {
  const context = useContext(ServeClientContext);
  if (context === null) {
    throw new Error("useServeClient must be used within ServeClientProvider");
  }
  return context;
}

/**
 * Safe hook to access serve client context
 * Returns default values if context is not available
 */
export function useServeClientSafe(): ServeClientContextValue {
  const context = useContext(ServeClientContext);
  if (context === null) {
    return {
      selectedClient: null,
      setSelectedClient: () => {},
      clients: [],
      setClients: () => {},
      isLoaded: false,
      fetchClients: async () => {},
      isFetching: false,
    };
  }
  return context;
}
