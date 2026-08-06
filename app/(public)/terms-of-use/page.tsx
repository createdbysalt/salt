import { redirect } from "next/navigation";

/**
 * /terms-of-use redirects to /terms-of-service
 *
 * The Termageddon-managed Terms of Service at /terms-of-service covers both
 * website and application usage. This route existed pre-rename and may be
 * linked from old emails and external sites.
 */
export default function TermsOfUseRedirect() {
  redirect("/terms-of-service");
}
