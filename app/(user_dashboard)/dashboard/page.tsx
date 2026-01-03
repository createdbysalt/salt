import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Redirect to overview page
  redirect("/dashboard/overview");
}
