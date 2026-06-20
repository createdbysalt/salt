import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResolvedLegalPage } from "@/app/_lib/legal/resolve-legal-page";
import { PortableTextProse } from "@/app/_lib/sanity/portable-text-prose";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import "@/app/_features/marketing/landing2/landing2.css";
import "./legal-document.css";
import { legalMarkdownComponents } from "./legal-markdown-components";

type LegalDocumentPageProps = {
  page: ResolvedLegalPage;
  afterHeader?: ReactNode;
};

export function LegalDocumentPage({
  page,
  afterHeader,
}: LegalDocumentPageProps) {
  return (
    <div className="landing2-home flex min-h-screen flex-col bg-background">
      <Landing2NavServer />

      <main className="flex-1">
        <Landing2Container className="py-12 sm:py-16 lg:py-20">
          <header className="legal-document-header mb-10 max-w-3xl pb-8">
            <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              {page.title}
            </h1>
            {page.lastUpdated ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Last updated{" "}
                <time className="text-foreground/70">{page.lastUpdated}</time>
              </p>
            ) : null}
            {page.appliesTo ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Applies to{" "}
                <span className="text-foreground/70">{page.appliesTo}</span>
              </p>
            ) : null}
            {afterHeader}
          </header>

          <article className="legal-prose max-w-3xl">
            {page.source === "sanity" && page.portableTextBody ? (
              <PortableTextProse value={page.portableTextBody} />
            ) : page.markdownBody ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={legalMarkdownComponents}
              >
                {page.markdownBody}
              </ReactMarkdown>
            ) : null}
          </article>
        </Landing2Container>
      </main>

      <Landing2FooterServer />
    </div>
  );
}
