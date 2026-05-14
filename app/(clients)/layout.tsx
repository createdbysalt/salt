import { ReactNode } from "react";
import { ClientsLayoutWrapper } from "@/app/_features/relationships/components/ClientsLayoutWrapper";

/**
 * Clients Layout - The Foundation Hub
 * Client relationships, the living breathing database
 */
export default async function ClientsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ClientsLayoutWrapper>{children}</ClientsLayoutWrapper>;
}
