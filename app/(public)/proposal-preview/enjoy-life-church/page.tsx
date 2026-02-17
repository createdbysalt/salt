"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Clock, Mail, Phone, ArrowRight, Sparkles, Zap, Edit3, Search, BarChart3 } from "lucide-react";
import { cn } from "@repo/utils";
import "./styles.css";

// Mock branding
const branding = {
  studioName: "Salt Studio",
  email: "hello@createdbysalt.com",
  phone: "(971) 442-1291",
};

// Mock proposal data
const proposal = {
  title: "Website Proposal",
  preparedFor: "Enjoy Life Church",
  preparedBy: "Salt Studio",
  date: "February 14, 2026",
  validUntil: "March 14, 2026",
  proposalNumber: "P-2026-0214",
};

// Intersection Observer hook for scroll animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Animated section wrapper
function AnimatedSection({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function EnjoyLifeChurchProposalPreview() {
  const [selectedPackage, setSelectedPackage] = useState<"community" | "essentials">("community");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <main className="min-h-screen bg-[#FDFBF7] font-body text-[#1a1a1a]">
        {/* Floating Header */}
        <header
          className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
            scrolled
              ? "bg-[#FDFBF7]/95 backdrop-blur-md shadow-sm py-3"
              : "bg-transparent py-6"
          )}
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/salt-studio-logo.png"
                alt="Salt Studio"
                className="h-8 w-auto brightness-0"
              />
            </div>
            <div className="flex items-center gap-3">
              <a href="https://wa.me/19714421291" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 px-4 py-2 rounded-full border border-neutral-200 hover:border-neutral-300 transition-all">
                <Phone className="w-4 h-4" />
                WhatsApp
              </a>
              <a href="mailto:hello@createdbysalt.com?subject=Enjoy Life Church - Website Proposal" className="group relative overflow-hidden bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors">
                <span className="relative z-10 flex items-center gap-2">
                  Let's Talk
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero / Cover */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden grain">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/3 right-1/4 w-px h-32 bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent" />
          <div className="absolute bottom-1/3 left-1/4 w-32 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-neutral-200/50" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-neutral-200/50" />

          <div className="relative max-w-4xl mx-auto px-6 text-center pt-24">
            {/* Main title */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-8 leading-[0.95]">
              <span className="relative">
                Website Proposal
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-emerald-400/30" viewBox="0 0 200 10" preserveAspectRatio="none">
                  <path d="M0,5 Q50,0 100,5 T200,5" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h1>

            {/* Client name */}
            <p className="font-display text-2xl md:text-3xl text-neutral-500 font-normal mb-8">
              for {proposal.preparedFor}
            </p>

            {/* Meta info */}
            <div className="flex items-center justify-center text-sm text-neutral-500 mb-12">
              <span>Prepared by {branding.studioName}</span>
            </div>

            {/* Validity badge */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-amber-50 border border-amber-200/50 mb-24">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">
                Valid until {proposal.validUntil}
              </span>
            </div>

            {/* Scroll indicator */}
            <div className="flex flex-col items-center gap-2 text-neutral-400 mt-8">
              <span className="text-xs tracking-widest uppercase">Scroll</span>
              <div className="w-px h-12 bg-gradient-to-b from-neutral-300 to-transparent" />
            </div>
          </div>
        </section>

        {/* Understanding Your Vision */}
        <section className="py-32 relative">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <div className="grid lg:grid-cols-2 gap-16 items-start">
                {/* Left column - Editorial style */}
                <div className="lg:sticky lg:top-32">
                  <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                    01 / Understanding
                  </span>
                  <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-6 leading-tight">
                    We heard you.
                    <br />
                    <span className="text-neutral-400">Here's what we understand.</span>
                  </h2>
                  <p className="text-lg text-neutral-600 leading-relaxed">
                    You're ready to transform your digital presence from a static "poster board"
                    into a living, breathing platform that serves your growing community.
                  </p>

                  {/* Quote card */}
                  <div className="mt-12 relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full" />
                    <blockquote className="pl-8 py-6">
                      <p className="font-display text-xl italic text-neutral-700 leading-relaxed">
                        "We loved what you did with Viva Church. We want something modern like that,
                        but our volunteers need to be able to update it without calling a developer."
                      </p>
                      <footer className="mt-4 text-sm text-neutral-500">
                        — From our discovery call
                      </footer>
                    </blockquote>
                  </div>
                </div>

                {/* Right column - Goals cards */}
                <div className="space-y-6">
                  <AnimatedSection delay={100}>
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-md hover:border-emerald-100 transition-all group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Sparkles className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-xl font-medium mb-3">Your Goals</h3>
                          <ul className="space-y-3 text-neutral-600">
                            {[
                              "Attract a younger demographic while serving all members",
                              "Empower volunteers to maintain content easily",
                              "Create dynamic ministry pages that grow with your church",
                              "Get found on Google and AI answers (ChatGPT, Perplexity)",
                            ].map((goal, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>

                  <AnimatedSection delay={200}>
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-md hover:border-amber-100 transition-all group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                          <BarChart3 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-xl font-medium mb-3">What Matters Most</h3>
                          <ul className="space-y-3 text-neutral-600">
                            {[
                              { bold: "Volunteer-friendly editing", rest: "No technical knowledge needed" },
                              { bold: "Dynamic ministries", rest: "Add new ones through simple forms" },
                              { bold: "Life Groups directory", rest: "Searchable small group info" },
                              { bold: "Sermon archive", rest: "Filter by series and speaker" },
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                <span><strong className="text-neutral-900">{item.bold}</strong> — {item.rest}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Our Approach */}
        <section className="py-32 bg-[#1a1a1a] text-white relative overflow-hidden grain">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <AnimatedSection>
              <div className="max-w-2xl mb-16">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-400 font-medium mb-4 block">
                  02 / Approach
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-6">
                  Built for volunteers.
                  <br />
                  <span className="text-neutral-500">Not developers.</span>
                </h2>
                <p className="text-lg text-neutral-400 leading-relaxed">
                  We'll use a church-optimized platform built specifically for volunteer maintenance.
                  Click on any content to edit it — no backend navigation, no confusing dashboards.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Zap, title: "Modern & Fast", desc: "Built for speed on mobile and desktop", color: "emerald" },
                { icon: Edit3, title: "Visual Editing", desc: "Click directly on the page to make changes", color: "teal" },
                { icon: BarChart3, title: "Dynamic Content", desc: "Add ministries, events, sermons through forms", color: "amber" },
                { icon: Search, title: "SEO + AEO", desc: "Rank on Google and AI answers (ChatGPT, Perplexity)", color: "orange" },
              ].map((item, i) => (
                <AnimatedSection key={item.title} delay={i * 100}>
                  <div className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all h-full">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                      item.color === "emerald" && "bg-emerald-500/20 group-hover:bg-emerald-500/30",
                      item.color === "teal" && "bg-teal-500/20 group-hover:bg-teal-500/30",
                      item.color === "amber" && "bg-amber-500/20 group-hover:bg-amber-500/30",
                      item.color === "orange" && "bg-orange-500/20 group-hover:bg-orange-500/30",
                    )}>
                      <item.icon className={cn(
                        "w-6 h-6",
                        item.color === "emerald" && "text-emerald-400",
                        item.color === "teal" && "text-teal-400",
                        item.color === "amber" && "text-amber-400",
                        item.color === "orange" && "text-orange-400",
                      )} />
                    </div>
                    <h3 className="font-display text-lg font-medium mb-2">{item.title}</h3>
                    <p className="text-sm text-neutral-400">{item.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="py-32 relative bg-neutral-50">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-16">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                  03 / Our Work
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4">
                  Churches we've helped grow
                </h2>
                <p className="text-lg text-neutral-500 max-w-xl mx-auto">
                  See the results we've achieved for churches like yours
                </p>
              </div>
            </AnimatedSection>

            {/* Featured Case Study - VIVA Church */}
            <AnimatedSection delay={100}>
              <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-neutral-100 mb-8">
                <div className="grid lg:grid-cols-2">
                  {/* Image side */}
                  <div className="relative h-64 lg:h-auto lg:min-h-[480px] overflow-hidden">
                    <img
                      src="/case-study-viva-church.png"
                      alt="VIVA Church worship service"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium mb-2">
                        Featured Project
                      </span>
                      <h3 className="font-display text-2xl font-medium text-white">VIVA Church</h3>
                      <p className="text-white/80 text-sm">Oshawa, Ontario</p>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className="p-8 lg:p-12">
                    <p className="text-neutral-600 leading-relaxed mb-8">
                      We partnered with VIVA Church to build a custom website that truly reflects their heart, mission, and community. Our work focused on designing a user-first experience, developing a component library for scalability, and empowering their team with training.
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="text-center p-4 bg-emerald-50 rounded-xl">
                        <div className="font-display text-3xl font-semibold text-emerald-600">415%</div>
                        <div className="text-sm text-neutral-600 mt-1">Increase in engagement</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-xl">
                        <div className="font-display text-3xl font-semibold text-emerald-600">4x</div>
                        <div className="text-sm text-neutral-600 mt-1">Annual traffic growth</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-xl">
                        <div className="font-display text-3xl font-semibold text-amber-600">6</div>
                        <div className="text-sm text-neutral-600 mt-1">Staff managing the site</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-xl">
                        <div className="font-display text-3xl font-semibold text-amber-600">95%</div>
                        <div className="text-sm text-neutral-600 mt-1">Fewer maintenance requests</div>
                      </div>
                    </div>

                    <a
                      href="https://www.vivachurch.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
                    >
                      Visit vivachurch.ca
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Other Case Studies */}
            <div className="grid md:grid-cols-2 gap-8">
              <AnimatedSection delay={200}>
                <a
                  href="https://www.oneyouthconference.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 hover:shadow-lg hover:border-emerald-100 transition-all"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src="/case-study-one-youth.png"
                      alt="ONE Youth Conference event"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-block px-2 py-1 bg-red-500 rounded text-xs text-white font-medium">
                        Conference
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-medium mb-2 group-hover:text-emerald-600 transition-colors">
                      ONE Youth Conference
                    </h3>
                    <p className="text-neutral-600 text-sm mb-4">
                      Dynamic event site for the Pacific Northwest's premier youth gathering. Bold typography, countdown timers, and mobile-first registration.
                    </p>
                    <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                      View site <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </a>
              </AnimatedSection>

              <AnimatedSection delay={300}>
                <a
                  href="https://www.mficanada.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 hover:shadow-lg hover:border-emerald-100 transition-all"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src="/case-study-mfi-canada.png"
                      alt="MFI Canada church network"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-block px-2 py-1 bg-neutral-800 rounded text-xs text-white font-medium">
                        Network
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-medium mb-2 group-hover:text-emerald-600 transition-colors">
                      MFI Canada
                    </h3>
                    <p className="text-neutral-600 text-sm mb-4">
                      National church network with interactive map, member directory, and resource hub. Serving pastors and churches coast to coast.
                    </p>
                    <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                      View site <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </a>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Package Options */}
        <section className="py-32 relative">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-16">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                  04 / Investment
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4">
                  Choose your path
                </h2>
                <p className="text-lg text-neutral-500 max-w-xl mx-auto">
                  Two packages designed around your needs and budget
                </p>
              </div>
            </AnimatedSection>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              {/* Essentials Package */}
              <AnimatedSection delay={100}>
                <div
                  className={cn(
                    "relative rounded-3xl p-1 cursor-pointer transition-all duration-500",
                    selectedPackage === "essentials"
                      ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-2xl shadow-emerald-500/20"
                      : "bg-neutral-200 hover:bg-neutral-300"
                  )}
                  onClick={() => setSelectedPackage("essentials")}
                >
                  <div className={cn(
                    "bg-white rounded-[22px] p-8 h-full transition-colors",
                    selectedPackage === "essentials" && "bg-gradient-to-br from-emerald-50/50 to-white"
                  )}>
                    <h3 className="font-display text-2xl font-medium mb-2">Essentials Package</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xl text-neutral-400 line-through">$5,000</span>
                      <span className="font-display text-5xl font-semibold tracking-tight">$3,500</span>
                      <span className="text-neutral-400 text-sm">USD</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
                      <Sparkles className="w-3 h-3" />
                      30% Church Discount Applied
                    </div>
                    <p className="text-neutral-600 mb-6">
                      Your foundation — core pages every church needs, plus your choice of dynamic modules.
                    </p>

                    {/* Core Pages */}
                    <div className="mb-6">
                      <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-3">Core Pages Included</h4>
                      <div className="space-y-2">
                        {[
                          "Homepage",
                          "About Us",
                          "Plan Your Visit",
                          "Connect",
                          "Contact",
                          "Give / Donate",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-neutral-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Modules */}
                    <div className="pt-6 border-t border-neutral-100">
                      <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-3">Choose Your Dynamic Modules</h4>
                      <div className="bg-neutral-50 rounded-xl p-3 mb-4">
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          <strong className="text-neutral-700">What's a dynamic module?</strong> These are sections where you can keep adding content — like uploading new sermons, creating new events, or adding new ministries. Your team manages it all through simple forms.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: "Sermon Archive", price: 500, desc: "Upload sermons, organize by series & speaker" },
                          { name: "Ministries Hub", price: 500, desc: "Add ministries anytime, each gets its own page" },
                          { name: "Life Groups / Small Groups", price: 500, desc: "Members can browse & find their group" },
                          { name: "Dream Team / Volunteers", price: 500, desc: "Showcase serve opportunities & sign-ups" },
                          { name: "Events Calendar", price: 500, desc: "Post events with registration & reminders" },
                          { name: "Staff / Leadership", price: 500, desc: "Add team members with photos & bios" },
                          { name: "Seasonal Campaigns", price: 500, desc: "Dedicated pages for Easter, Christmas & more" },
                        ].map((module) => (
                          <div
                            key={module.name}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                              selectedModules.includes(module.name)
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-neutral-200 hover:border-neutral-300"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModules(prev =>
                                prev.includes(module.name)
                                  ? prev.filter(m => m !== module.name)
                                  : [...prev, module.name]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                selectedModules.includes(module.name)
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-neutral-300"
                              )}>
                                {selectedModules.includes(module.name) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-neutral-700">{module.name}</span>
                                <p className="text-xs text-neutral-400">{module.desc}</p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-neutral-600">+${module.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-amber-600" />
                        </div>
                        <span className="text-sm font-medium text-neutral-700">1-hour training session with your team</span>
                      </div>
                      <span className="text-sm text-neutral-500">6 core pages + your selected modules</span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Community Package */}
              <AnimatedSection delay={200}>
                <div
                  className={cn(
                    "relative rounded-3xl p-1 cursor-pointer transition-all duration-500",
                    selectedPackage === "community"
                      ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-2xl shadow-emerald-500/20"
                      : "bg-neutral-200 hover:bg-neutral-300"
                  )}
                  onClick={() => setSelectedPackage("community")}
                >
                  <div className={cn(
                    "bg-white rounded-[22px] p-8 h-full transition-colors",
                    selectedPackage === "community" && "bg-gradient-to-br from-emerald-50/50 to-white"
                  )}>
                    {selectedPackage === "community" && (
                      <div className="absolute -top-4 left-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        Recommended
                      </div>
                    )}

                    <h3 className="font-display text-2xl font-medium mb-2">Community Package</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xl text-neutral-400 line-through">$8,000</span>
                      <span className="font-display text-5xl font-semibold tracking-tight">$5,600</span>
                      <span className="text-neutral-400 text-sm">USD</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
                      <Sparkles className="w-3 h-3" />
                      30% Church Discount Applied
                    </div>
                    <p className="text-neutral-600 mb-6">
                      Everything you described — the complete solution for a growing church.
                    </p>

                    {/* Everything Included */}
                    <div className="mb-6">
                      <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-3">All Core Pages</h4>
                      <div className="space-y-2">
                        {[
                          "Homepage",
                          "About Us",
                          "Plan Your Visit",
                          "Connect",
                          "Contact",
                          "Give / Donate",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-neutral-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* All Dynamic Modules */}
                    <div className="pt-6 border-t border-neutral-100">
                      <h4 className="text-xs tracking-[0.15em] uppercase text-emerald-600 font-semibold mb-3">All Dynamic Modules Included</h4>
                      <div className="space-y-2">
                        {[
                          "Sermon Archive",
                          "Ministries Hub",
                          "Life Groups / Small Groups",
                          "Dream Team / Volunteers",
                          "Events Calendar",
                          "Staff / Leadership",
                          "Seasonal Campaigns",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-sm text-neutral-700 font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-amber-600" />
                        </div>
                        <span className="text-sm font-medium text-neutral-700">1-hour training session with your team</span>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">12-16 pages total</span>
                      <p className="text-xs text-neutral-400 mt-1">Best value — save $1,400+ vs. building à la carte</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Add-ons Section */}
            <AnimatedSection delay={300}>
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="font-display text-2xl font-medium mb-2">Add-ons</h3>
                  <p className="text-neutral-500">Enhance your site with these optional features</p>
                </div>

                {/* Content Add-ons */}
                <div className="mb-8">
                  <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-4">Content & Media</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: "Blog / News", price: 500, desc: "Share updates, stories & articles" },
                      { name: "Live Stream Page", price: 500, desc: "Schedule-aware streaming integration" },
                      { name: "Resource Library", price: 500, desc: "Downloadable guides & content" },
                    ].map((addon) => (
                      <div
                        key={addon.name}
                        className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-emerald-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-neutral-800">{addon.name}</h4>
                          <span className="text-sm font-semibold text-emerald-600">+${addon.price}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{addon.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Add-ons */}
                <div className="mb-8">
                  <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    AI-Powered Features
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { name: "AI Chat Assistant", price: 1000, desc: "24/7 virtual greeter answers FAQs about service times, ministries & more" },
                      { name: "AI Sermon Insights", price: 1000, desc: "Auto-generate summaries, key scriptures & discussion questions" },
                    ].map((addon) => (
                      <div
                        key={addon.name}
                        className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-neutral-800">{addon.name}</h4>
                          <span className="text-sm font-semibold text-amber-600">+${addon.price}</span>
                        </div>
                        <p className="text-xs text-neutral-600">{addon.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Add-ons */}
                <div>
                  <h4 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-4">Advanced</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { name: "Multi-language", price: 800, desc: "Full site translation for multilingual congregations" },
                    ].map((addon) => (
                      <div
                        key={addon.name}
                        className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-emerald-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-neutral-800">{addon.name}</h4>
                          <span className="text-sm font-semibold text-emerald-600">+${addon.price}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{addon.desc}</p>
                      </div>
                    ))}
                    <div className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-neutral-800">Member Portal</h4>
                        <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">Custom Quote</span>
                      </div>
                      <p className="text-xs text-neutral-500">Private area for members with exclusive content</p>
                      <p className="text-xs text-emerald-600 font-medium mt-2">Starting at $2,500</p>
                    </div>
                  </div>
                </div>

                {/* Retainers Section */}
                <div className="mt-12 pt-12 border-t border-neutral-200">
                  <div className="text-center mb-8">
                    <h3 className="font-display text-2xl font-medium mb-2">After Launch</h3>
                    <p className="text-neutral-500">Ongoing support powered by our studio platform</p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        name: "Starter",
                        price: 150,
                        desc: "Keep the lights on",
                        features: ["Hosting & security updates", "SSL certificate", "Uptime monitoring", "Bug fixes"]
                      },
                      {
                        name: "Growth",
                        price: 300,
                        desc: "Stay visible online",
                        features: ["Everything in Starter", "Monthly SEO/AEO scan", "Fixes & optimizations implemented"],
                        popular: true
                      },
                      {
                        name: "Partner",
                        price: 600,
                        desc: "Proactive growth",
                        features: ["Everything in Growth", "Weekly scans + fixes", "Monthly growth call", "Priority support (48hr)", "Competitor tracking"]
                      },
                      {
                        name: "Full Service",
                        price: 1500,
                        desc: "Your web team",
                        features: ["Everything in Partner", "Weekly content updates", "Same-day support", "Sermon SEO optimization", "Seasonal campaign support"]
                      },
                    ].map((tier) => (
                      <div
                        key={tier.name}
                        className={cn(
                          "rounded-2xl p-5 border transition-all",
                          tier.popular
                            ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-300"
                            : "bg-white border-neutral-200 hover:border-neutral-300"
                        )}
                      >
                        {tier.popular && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Popular</span>
                        )}
                        <h4 className="font-display text-lg font-medium text-neutral-800 mt-2">{tier.name}</h4>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="font-display text-2xl font-semibold">${tier.price.toLocaleString()}</span>
                          <span className="text-neutral-400 text-sm">/mo</span>
                        </div>
                        <p className="text-xs text-neutral-500 mb-3">{tier.desc}</p>
                        <ul className="space-y-1.5 mb-3">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-xs text-neutral-600">
                              <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-32 bg-neutral-50 relative">
          <div className="max-w-4xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-16">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                  05 / Timeline
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4">
                  The journey to launch
                </h2>
                <p className="text-lg text-neutral-500">
                  3 months from kickoff to launch
                </p>
              </div>
            </AnimatedSection>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200" />

              <div className="space-y-12">
                {[
                  { phase: "Kickoff & Discovery", duration: "Week 1-2", dates: "Feb 17 - Feb 28", desc: "Contract signed, brand assets collected, content checklist shared" },
                  { phase: "Design", duration: "Week 3-4", dates: "Mar 1 - Mar 14", desc: "Homepage + key page designs, your feedback & revisions" },
                  { phase: "Build", duration: "Week 5-9", dates: "Mar 15 - Apr 18", desc: "Development begins, you provide content as we build" },
                  { phase: "Review & Revisions", duration: "Week 10-11", dates: "Apr 19 - May 2", desc: "Full site review, revisions, polish" },
                  { phase: "Training & Launch", duration: "Week 12", dates: "May 3 - May 9", desc: "Training session, soft launch, go live!", final: true },
                ].map((item, index) => (
                  <AnimatedSection key={item.phase} delay={index * 100}>
                    <div className={cn(
                      "relative flex items-start gap-8",
                      index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    )}>
                      {/* Timeline dot */}
                      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-4 border-[#FDFBF7]",
                          item.final ? "bg-emerald-500" : "bg-white border-emerald-400"
                        )}>
                          {item.final && (
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className={cn(
                        "flex-1 pl-20 md:pl-0",
                        index % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"
                      )}>
                        <div className="inline-flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                            {item.duration}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-medium mb-1">{item.phase}</h3>
                        <p className="text-sm text-emerald-600 mb-1">{item.dates}</p>
                        <p className="text-sm text-neutral-500">{item.desc}</p>
                      </div>

                      {/* Spacer for alternating layout */}
                      <div className="hidden md:block flex-1" />
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Payment Schedule */}
        <section className="py-32">
          <div className="max-w-3xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-12">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                  06 / Payment
                </span>
                <h2 className="font-display text-4xl font-medium tracking-tight mb-4">
                  Simple milestone payments
                </h2>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-neutral-200/50 border border-neutral-100 overflow-hidden">
                <div className="divide-y divide-neutral-100">
                  {[
                    { label: "Project Deposit", percent: 50, amount: selectedPackage === "community" ? 2800 : 1750, when: "Upon signing", active: true },
                    { label: "Build Complete", percent: 40, amount: selectedPackage === "community" ? 2240 : 1400, when: "Before training" },
                    { label: "Final Launch", percent: 10, amount: selectedPackage === "community" ? 560 : 350, when: "After go-live" },
                  ].map((item) => (
                    <div key={item.label} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center font-display font-semibold text-lg",
                          item.active
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                            : "bg-neutral-100 text-neutral-600"
                        )}>
                          {item.percent}%
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{item.label}</p>
                          <p className="text-sm text-neutral-500">{item.when}</p>
                        </div>
                      </div>
                      <p className="font-display text-2xl font-semibold">
                        ${item.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 flex items-center justify-between">
                  <p className="font-display text-lg font-medium">Total Investment</p>
                  <p className="font-display text-3xl font-bold text-emerald-700">
                    ${selectedPackage === "community" ? "5,600" : "3,500"}
                    {selectedPackage === "essentials" && selectedModules.length > 0 && (
                      <span className="text-lg font-normal text-neutral-500 ml-2">+ modules</span>
                    )}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-32 bg-neutral-50">
          <div className="max-w-4xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-12">
                <span className="text-xs tracking-[0.2em] uppercase text-emerald-600 font-medium mb-4 block">
                  07 / Included
                </span>
                <h2 className="font-display text-4xl font-medium tracking-tight">
                  Everything you need to succeed
                </h2>
              </div>

              {/* Deliverables */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div>
                  <h3 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-4">Strategy & Research</h3>
                  <div className="space-y-3">
                    {[
                      "Competitor analysis report",
                      "Initial SEO/AEO audit",
                      "Content strategy recommendations",
                      "Performance baseline report",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-sm text-neutral-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-semibold mb-4">Training & Support</h3>
                  <div className="space-y-3">
                    {[
                      "1-hour training session (recorded)",
                      "Client portal access",
                      "Documentation & guides",
                      "30-day post-launch support",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-sm text-neutral-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { text: "Mobile-responsive design", highlight: false },
                  { text: "SEO + AEO optimization", highlight: true },
                  { text: "Fast page load speeds", highlight: false },
                  { text: "Giving integration", highlight: false },
                  { text: "Planning Center links", highlight: false },
                  { text: "SSL security certificate", highlight: false },
                ].map((item, i) => (
                  <AnimatedSection key={item.text} delay={i * 50}>
                    <div className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border transition-all",
                      item.highlight
                        ? "bg-white border-emerald-200"
                        : "bg-white border-neutral-200"
                    )}>
                      <Check className={cn(
                        "w-4 h-4 flex-shrink-0",
                        item.highlight ? "text-emerald-600" : "text-neutral-400"
                      )} />
                      <span className="text-sm text-neutral-700">{item.text}</span>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-[#1a1a1a] text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-3xl mx-auto px-6 text-center relative">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 text-emerald-400 mb-6">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium tracking-wide">Ready to begin?</span>
              </div>

              <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-6">
                Let's bring your vision to life
              </h2>

              <p className="text-lg text-neutral-400 mb-10 max-w-xl mx-auto">
                We're excited to partner with Enjoy Life Church.
                <br />
                <span className="text-emerald-400">"Life is Better Together"</span> — and we'd love to help you share that message.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="mailto:hello@createdbysalt.com?subject=Enjoy Life Church - Website Proposal" className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-5 rounded-full text-lg font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40">
                  Get Started
                  <Mail className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="absolute inset-0 rounded-full animate-shimmer" />
                </a>
                <a href="https://wa.me/19714421291" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  or WhatsApp us
                </a>
              </div>

              <p className="mt-8 text-sm text-neutral-500">
                We'll follow up within 24 hours to discuss next steps
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 bg-[#0f0f0f] text-neutral-400">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <img
                  src="/salt-studio-logo.png"
                  alt="Salt Studio"
                  className="h-8 w-auto invert"
                />
              </div>

              <div className="flex items-center gap-8 text-sm">
                <a href={`mailto:${branding.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  {branding.email}
                </a>
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {branding.phone}
                </span>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-500">
              <p>This proposal is valid for 30 days. Pricing and availability subject to change.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
