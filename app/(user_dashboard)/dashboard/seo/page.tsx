import { redirect } from "next/navigation";

/**
 * SEO Overview - Redirect to Reports
 *
 * The SEO overview has been consolidated into the Reports page
 * under the Performance tab. This redirect ensures old links
 * and bookmarks continue to work.
 */
export default function SeoOverviewPage() {
  redirect("/dashboard/reports?tab=performance");
}
