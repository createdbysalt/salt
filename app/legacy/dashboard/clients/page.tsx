import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const { studio, supabase } = await getStudioContext();
  
  // Build query
  let query = supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false });
  
  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }
  
  const { data: clients, error } = await query;
  
  if (error) {
    console.error("Error loading clients:", error);
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your studio&apos;s clients
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          + New Client
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card bg-card shadow">
        <div className="p-6">
          <form className="flex flex-col sm:flex-row gap-4">
            <input
              type="search"
              name="search"
              placeholder="Search clients..."
              defaultValue={search}
              className="input input-bordered flex-1"
            />
            
            <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
              Search
            </button>
          </form>
        </div>
      </div>
      
      {/* Clients List */}
      {!clients || clients.length === 0 ? (
        <div className="card bg-card shadow">
          <div className="p-6 text-center py-12">
            <div className="text-foreground/50">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">
                {search ? "No clients match your search" : "No clients yet"}
              </p>
              <p className="mb-4">
                {search
                  ? "Try adjusting your search"
                  : "Add your first client to get started"}
              </p>
              <Link href="/dashboard/clients/new" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Add Your First Client
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="card bg-card shadow hover:shadow-lg transition"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-lg">{client.name}</h3>
                </div>
                
                {client.contact_email && (
                  <p className="text-sm text-foreground/50">{client.contact_email}</p>
                )}
                
                {client.contact_phone && (
                  <p className="text-sm text-foreground/50">{client.contact_phone}</p>
                )}
                
                <div className="flex gap-2 justify-end mt-4">
                  <div className="text-xs text-foreground/50">
                    Added {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

