import type { ReactNode } from "react";
import { Landing2FooterServer } from "@/app/_features/marketing/landing2/Landing2FooterServer";
import { Landing2NavServer } from "@/app/_features/marketing/landing2/Landing2NavServer";
import { Landing2WaitlistSection } from "@/app/_features/marketing/landing2/Landing2WaitlistSection";
import "@/app/_features/marketing/landing2/landing2.css";

type BlogArticlePageProps = {
  children: ReactNode;
};

export function BlogArticlePage({ children }: BlogArticlePageProps) {
  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <Landing2NavServer />
        {children}
        <Landing2WaitlistSection />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
