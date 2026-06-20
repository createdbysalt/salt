import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import type { ResolvedCalculatorForm } from "@/app/_features/marketing/calculator/calculator-form-config";
import "@/app/_features/marketing/landing2/landing2.css";
import { MoneyOnTheTableCalculator } from "./MoneyOnTheTableCalculator";

type MoneyOnTheTablePageProps = {
  form: ResolvedCalculatorForm;
};

export function MoneyOnTheTablePage({ form }: MoneyOnTheTablePageProps) {
  return (
    <div className="landing2-home">
      <main className="relative min-h-screen bg-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(0,148,158,0.07), transparent 60%), radial-gradient(ellipse 70% 45% at 90% 8%, rgba(243,166,24,0.08), transparent 60%)",
          }}
        />
        <Landing2NavServer />
        <MoneyOnTheTableCalculator form={form} />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
