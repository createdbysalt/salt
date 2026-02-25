"use client";

import * as React from "react";
import type { InboxItem } from "../types";

type InboxViewMode = "inbox" | "done";

interface InboxContextValue {
  selectedItem: InboxItem | null;
  setSelectedItem: (item: InboxItem | null) => void;
  viewMode: InboxViewMode;
  setViewMode: (mode: InboxViewMode) => void;
}

const InboxContext = React.createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [selectedItem, setSelectedItem] = React.useState<InboxItem | null>(null);
  const [viewMode, setViewMode] = React.useState<InboxViewMode>("inbox");

  return (
    <InboxContext.Provider value={{ selectedItem, setSelectedItem, viewMode, setViewMode }}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = React.useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}
