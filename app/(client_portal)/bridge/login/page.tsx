import { BridgeLoginForm } from "../components/bridge-login-form";

/**
 * Bridge login page (path: /login on bridge subdomain)
 *
 * This page exists as a fallback for direct navigation to /login.
 * The main bridge home page (/) shows the login form inline when not authenticated.
 */
export default function BridgeLoginPage() {
  return <BridgeLoginForm />;
}
