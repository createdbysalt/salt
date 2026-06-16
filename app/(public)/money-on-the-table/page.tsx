import { MoneyOnTheTablePage } from "@/app/_features/marketing/calculator/MoneyOnTheTablePage";
import { getSEOTags } from "@/app/_lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `The Money on the Table Calculator | ${config.appName}`,
  description:
    "Answer 7 questions and see an estimate of the revenue your business is leaving on the table — slow replies, silent proposals, and admin hours.",
  canonicalUrlRelative: "/money-on-the-table",
  openGraph: {
    title: "How much is your business leaving on the table?",
    description:
      "Seven questions, two minutes. See an estimate of what slow replies, silent proposals, and admin hours cost a business like yours every year.",
    url: `https://${config.domainName}/money-on-the-table`,
  },
});

export default function MoneyOnTheTableRoute() {
  return <MoneyOnTheTablePage />;
}
