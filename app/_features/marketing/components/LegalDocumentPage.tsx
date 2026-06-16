import Link from "next/link";
import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareLegalMarkdown } from "@/app/_lib/legal/prepare-legal-markdown";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import "@/app/_features/marketing/landing2/landing2.css";
import "./legal-document.css";

type LegalDocumentPageProps = {
  title: string;
  markdown: string;
  afterHeader?: ReactNode;
};

const legalMarkdownComponents: Components = {
  a: ({ href, children }) => {
    const className =
      "text-foreground underline underline-offset-[3px] transition-colors hover:text-flame";

    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  h2: ({ children }) => (
    <h2 className="font-display mt-11 mb-4 text-[1.375rem] tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-3 text-base font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-[1.125rem] text-[15px] leading-7 text-foreground/80">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-[1.125rem] list-disc space-y-2 pl-5 text-[15px] leading-7 text-foreground/80 marker:text-foreground/45">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-[1.125rem] list-decimal space-y-2 pl-5 text-[15px] leading-7 text-foreground/80 marker:text-foreground/45">
      {children}
    </ol>
  ),
  hr: () => <hr className="my-10 border-foreground/10" />,
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-foreground/12 bg-muted/50 px-3.5 py-2.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-foreground/12 px-3.5 py-2.5 align-top text-foreground/80">
      {children}
    </td>
  ),
};

export function LegalDocumentPage({
  title,
  markdown,
  afterHeader,
}: LegalDocumentPageProps) {
  const prepared = prepareLegalMarkdown(markdown, title);

  return (
    <div className="landing2-home flex min-h-screen flex-col bg-background">
      <Landing2NavServer />

      <main className="flex-1">
        <Landing2Container className="py-12 sm:py-16 lg:py-20">
          <header className="legal-document-header mb-10 max-w-3xl pb-8">
            <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              {prepared.title}
            </h1>
            {prepared.lastUpdated ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Last updated{" "}
                <time className="text-foreground/70">{prepared.lastUpdated}</time>
              </p>
            ) : null}
            {prepared.appliesTo ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Applies to{" "}
                <span className="text-foreground/70">{prepared.appliesTo}</span>
              </p>
            ) : null}
            {afterHeader}
          </header>

          <article className="legal-prose max-w-3xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={legalMarkdownComponents}
            >
              {prepared.body}
            </ReactMarkdown>
          </article>
        </Landing2Container>
      </main>

      <Landing2FooterServer />
    </div>
  );
}
