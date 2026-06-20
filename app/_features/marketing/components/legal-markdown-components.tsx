import Link from "next/link";
import type { Components } from "react-markdown";

export const legalMarkdownComponents: Components = {
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
