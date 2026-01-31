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
}

const ServeClientContext = createContext<ServeClientContextValue | null>(null);

const STORAGE_KEY = "salt-serve-selected-client";

/**
 * Provider for Serve mode client selection
 * Persists selected client to localStorage
 */
export function ServeClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClientState] = useState<ServeClient | null>(
    null
  );
  const [clients, setClients] = useState<ServeClient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
    };
  }
  return context;
}
