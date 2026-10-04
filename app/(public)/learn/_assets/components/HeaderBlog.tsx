"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import config from "@/config";
import ButtonSignin from "@/app/_features/auth/components/ButtonSignin";
import { categories } from "../content";

/**
 * Header for the /learn section: logo, "All posts", a categories menu, and the
 * sign-in call to action. Collapses to a disclosure panel on small screens.
 */
export default function HeaderBlog() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const cta = (
    <ButtonSignin
      text="Prevent disputes"
      extraStyle="bg-primary text-primary-foreground hover:bg-primary/90 md:text-xs md:px-3 md:py-1.5"
    />
  );

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" title={`${config.appName} home`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/salt-logo-blue.svg" alt={`${config.appName} logo`} className="h-7 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">
            All posts
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              Categories
              <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ul className="absolute left-0 z-30 mt-3 w-80 rounded-xl border border-border bg-card p-2 shadow-lg">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/learn/category/${category.slug}`}
                    className="block rounded-lg px-3 py-2 hover:bg-muted"
                  >
                    <span className="block font-medium">{category.titleShort ?? category.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {category.descriptionShort ?? category.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="hidden lg:block">{cta}</div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="learn-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg p-2 lg:hidden"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden className="block text-xl leading-none">{menuOpen ? "×" : "≡"}</span>
        </button>
      </nav>

      {menuOpen ? (
        <div id="learn-mobile-menu" className="border-t border-border px-6 py-4 lg:hidden">
          <Link href="/learn" className="block py-2">
            All posts
          </Link>
          <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Categories</p>
          <ul className="mt-1 space-y-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/learn/category/${category.slug}`} className="block py-1.5">
                  {category.titleShort ?? category.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">{cta}</div>
        </div>
      ) : null}
    </header>
  );
}
