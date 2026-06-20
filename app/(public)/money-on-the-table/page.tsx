import { MoneyOnTheTablePage } from "@/app/_features/marketing/calculator/MoneyOnTheTablePage";
import { fetchResolvedCalculatorForm } from "@/app/_features/marketing/calculator/calculator-form-config";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export async function generateMetadata() {
  const form = await fetchResolvedCalculatorForm();

  return getSEOTags({
    title: `The Money on the Table Calculator | ${config.appName}`,
    description: form.subheading,
    canonicalUrlRelative: "/money-on-the-table",
    openGraph: {
      title: form.heading.replace(/\n/g, " "),
      description: form.subheading,
      url: `https://${config.domainName}/money-on-the-table`,
    },
  });
}

export default async function MoneyOnTheTableRoute() {
  const form = await fetchResolvedCalculatorForm();

  return <MoneyOnTheTablePage form={form} />;
}
