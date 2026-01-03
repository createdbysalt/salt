import React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
