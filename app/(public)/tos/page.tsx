import { redirect } from "next/navigation";

/**
 * /tos redirects to /terms-of-service
 *
 * The Termageddon-managed Terms of Service at /terms-of-service covers both
 * website and application usage. There's no separate document.
 */
export default function ServiceTermsRedirect() {
  redirect("/terms-of-service");
}
