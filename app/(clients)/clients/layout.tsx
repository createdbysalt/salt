interface ClientsLayoutProps {
  children: React.ReactNode;
}

/**
 * Clients Layout - Container for clients routes
 * Each child route (list, detail) provides its own header
 */
export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
