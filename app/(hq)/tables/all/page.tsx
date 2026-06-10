import { redirect } from "next/navigation";

export default function LegacyAllTablesRoute() {
  redirect("/spaces/all");
}
