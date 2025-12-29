import React from "react";
import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";
import ButtonAccount from "@/components/ButtonAccount";

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context } = await getStudioContext();
  
  return (
    <div className="min-h-screen bg-base-200">
      {/* Top Navigation */}
      <div className="navbar bg-base-100 border-b border-base-300">
        <div className="flex-1">
          <Link href="/dashboard" className="btn btn-ghost text-xl">
            Salt Core
          </Link>
          
          <div className="hidden md:flex ml-8 gap-2">
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              Dashboard
            </Link>
            <Link href="/dashboard/clients" className="btn btn-ghost btn-sm">
              Clients
            </Link>
            <Link href="/dashboard/projects" className="btn btn-ghost btn-sm">
              Projects
            </Link>
            <Link href="/dashboard/settings" className="btn btn-ghost btn-sm">
              Settings
            </Link>
          </div>
        </div>
        
        <div className="flex-none gap-2">
          <div className="text-sm text-base-content/70 hidden sm:block">
            {context.userId}
          </div>
          <ButtonAccount />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </div>
    </div>
  );
}
