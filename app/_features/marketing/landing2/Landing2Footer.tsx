"use client";

import Link from "next/link";
import { ArrowUpRight, Instagram, Linkedin, Sparkles, Youtube } from "lucide-react";
import { cn } from "@repo/utils";
import { SALT_SOCIAL } from "@/app/_lib/seo/social-links";
import { SALT_LOGO_PATH } from "./constants";
import { Landing2Container } from "./Landing2Container";

const exploreLinks = [
  { label: "Product", href: "#product" },
  { label: "Early access", href: "/waitlist?source=landing2-footer" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-use" },
  { label: "Early Access Terms", href: "/early-access" },
  { label: "Cookies", href: "/cookie-policy" },
];

const socialLinks = [
  { label: "LinkedIn", href: SALT_SOCIAL.linkedin, icon: Linkedin },
  { label: "Reddit", href: SALT_SOCIAL.reddit, icon: RedditIcon },
  { label: "Instagram", href: SALT_SOCIAL.instagram, icon: Instagram },
  { label: "X", href: SALT_SOCIAL.x, icon: XIcon },
  { label: "YouTube", href: SALT_SOCIAL.youtube, icon: Youtube },
] as const;

const LLM_INFO_PATH = "/llm-info";

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.03 4.87-6.77 4.87-3.74 0-6.77-2.176-6.77-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l-.842-3.94c.057-.024.116-.04.18-.04zm-7.86 9.89c.663 0 1.201.538 1.201 1.201 0 .663-.538 1.201-1.201 1.201-.663 0-1.201-.538-1.201-1.201 0-.663.538-1.201 1.201-1.201zm5.718 0c.663 0 1.201.538 1.201 1.201 0 .663-.538 1.201-1.201 1.201-.663 0-1.201-.538-1.201-1.201 0-.663.538-1.201 1.201-1.201z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function HeyAiLearnLink({ className }: { className?: string }) {
  return (
    <Link
      href={LLM_INFO_PATH}
      className={cn(
        "group flex w-full max-w-[220px] items-center gap-3",
        className
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-flame/10 ring-1 ring-flame/20">
        <Sparkles className="size-3.5 text-flame" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Hey AI
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground/80 transition group-hover:text-foreground">
          Learn about us
          <ArrowUpRight
            className="size-3 shrink-0 text-foreground/45 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-flame"
            strokeWidth={2}
          />
        </span>
      </span>
    </Link>
  );
}

function SocialIcons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {socialLinks.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className={cn(
              "grid size-10 place-items-center rounded-full border border-border/70 bg-background/80 text-foreground/65",
              "transition hover:border-foreground/20 hover:bg-card hover:text-foreground"
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </a>
        );
      })}
    </div>
  );
}

export function Landing2Footer() {
  return (
    <footer className="border-t border-foreground/10 bg-muted/30">
      <Landing2Container className="py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Salt home">
              <span
                aria-hidden
                className="block h-5 w-12 bg-foreground"
                style={{
                  maskImage: `url(${SALT_LOGO_PATH})`,
                  WebkitMaskImage: `url(${SALT_LOGO_PATH})`,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Proactive AI for your business — connects your tools, surfaces what matters, waits
              for your approval.
            </p>
            <SocialIcons className="mt-5" />
          </div>

          <nav aria-label="Footer" className="flex flex-col items-start">
            <ul className="space-y-2.5">
              {exploreLinks.map((link) => {
                const className =
                  "text-sm text-foreground/75 transition hover:text-foreground hover:underline underline-offset-4";
                return (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className={className}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={className}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 w-full max-w-[220px] border-t border-foreground/10 pt-5">
              <a
                href="mailto:support@usesalt.io"
                className="inline-block text-xs text-muted-foreground transition hover:text-foreground"
              >
                support@usesalt.io
              </a>
              <HeyAiLearnLink className="mt-4" />
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-foreground/10 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Simcoe House Inc. All rights reserved.
          </p>

          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-end"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Landing2Container>
    </footer>
  );
}
