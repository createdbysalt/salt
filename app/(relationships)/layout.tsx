import { ReactNode } from "react";
import { ClientsLayoutWrapper } from "@/app/_features/relationships/components/ClientsLayoutWrapper";

/**
 * Relationships Layout
 * Wraps the relationships space (formerly clients)
 * Uses the same layout wrapper for now - will be renamed in Phase 2
 */
export default async function RelationshipsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ClientsLayoutWrapper>{children}</ClientsLayoutWrapper>;
}
