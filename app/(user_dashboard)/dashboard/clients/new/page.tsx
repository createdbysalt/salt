import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";
import { ClientForm } from "./ClientForm";

export default async function NewClientPage() {
  await getStudioContext(); // Ensure user is authenticated and is a studio member
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="text-sm text-base-content/70 hover:text-base-content inline-flex items-center gap-1 mb-4"
        >
          ← Back to Clients
        </Link>
        <h1 className="text-3xl font-bold">Add New Client</h1>
        <p className="text-base-content/70 mt-2">
          Create a new client and their Bridge portal will be automatically set up.
        </p>
      </div>
      
      {/* Form */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <ClientForm />
        </div>
      </div>
    </div>
  );
}

