import { redirect } from "next/navigation";

/**
 * Work Home - Redirects to projects list
 * Future: Could be a dashboard showing active work across projects/retainers
 */
export default function WorkPage() {
  redirect("/work/projects");
}
