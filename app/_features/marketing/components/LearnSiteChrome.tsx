import { Suspense, type ReactNode } from "react";
import HeaderBlog from "@/app/(public)/learn/_assets/components/HeaderBlog";
import Footer from "@/app/_features/marketing/components/Footer";

/** Classic learn chrome (blog header + footer). Used by index, category, author, and non-compare articles. */
export function LearnSiteChrome({ children }: { children: ReactNode }) {
  return (
    <div>
      <Suspense>
        <HeaderBlog />
      </Suspense>
      <main className="mx-auto min-h-screen max-w-6xl p-8">{children}</main>
      <div className="h-24" />
      <Footer />
    </div>
  );
}
