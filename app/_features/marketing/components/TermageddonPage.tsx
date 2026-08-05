import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import "@/app/_features/marketing/landing2/landing2.css";
import "./termageddon.css";
import { TermageddonEmbed } from "./TermageddonEmbed";

type TermageddonPageProps = {
  title: string;
  policyId: string;
  lastUpdated?: string;
};

export function TermageddonPage({
  title,
  policyId,
  lastUpdated,
}: TermageddonPageProps) {
  return (
    <div className="landing2-home flex min-h-screen flex-col bg-background">
      <Landing2NavServer />

      <main className="flex-1">
        <Landing2Container className="py-12 sm:py-16 lg:py-20">
          <header className="legal-document-header mb-10 max-w-3xl pb-8">
            <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              {title}
            </h1>
            {lastUpdated && (
              <p className="mt-4 text-sm text-muted-foreground">
                Last updated{" "}
                <time className="text-foreground/70">{lastUpdated}</time>
              </p>
            )}
          </header>

          <article className="termageddon-content max-w-3xl">
            <TermageddonEmbed policyId={policyId} title={title} />
          </article>
        </Landing2Container>
      </main>

      <Landing2FooterServer />
    </div>
  );
}
