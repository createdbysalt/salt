import { getOrganizations } from "@/app/_features/relationships/queries";
import { OrgsPage } from "@/app/_features/orgs/components/OrgsPage";

export default async function OrgsRoute() {
  const organizations = await getOrganizations();
  return <OrgsPage initialOrganizations={organizations} />;
}
