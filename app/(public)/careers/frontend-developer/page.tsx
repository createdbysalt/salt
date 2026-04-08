"use client";

import { useState } from "react";
import { Button } from "@repo/ui";
import { MessageCircle, Globe } from "lucide-react";
import { motion } from "framer-motion";

// Note: Metadata is in layout.tsx since this is a client component

// ============================================================================
// TECH LOGOS (SVG Components)
// ============================================================================

function ReactLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 9.861a2.139 2.139 0 100 4.278 2.139 2.139 0 000-4.278zm-5.992 6.394l-.472-.12C2.018 15.246 0 13.737 0 11.996s2.018-3.25 5.536-4.139l.472-.119.133.468a23.53 23.53 0 001.363 3.578l.101.213-.101.213a23.307 23.307 0 00-1.363 3.578l-.133.467zM5.317 8.95c-2.674.751-4.315 1.9-4.315 3.046 0 1.145 1.641 2.294 4.315 3.046a24.95 24.95 0 011.182-3.046 24.752 24.752 0 01-1.182-3.046zm12.675 7.305l-.133-.469a23.357 23.357 0 00-1.364-3.577l-.101-.213.101-.213a23.42 23.42 0 001.364-3.578l.133-.468.473.119c3.517.889 5.535 2.398 5.535 4.14s-2.018 3.25-5.535 4.139l-.473.12zm-.491-4.259c.48 1.039.877 2.06 1.182 3.046 2.675-.752 4.315-1.901 4.315-3.046 0-1.146-1.641-2.294-4.315-3.046a24.788 24.788 0 01-1.182 3.046zM5.31 8.945l-.133-.467C4.188 4.992 4.488 2.494 6 1.622c1.483-.856 3.864.155 6.359 2.716l.34.349-.34.349a23.552 23.552 0 00-2.422 2.967l-.135.193-.235.02a23.657 23.657 0 00-3.785.61l-.472.119zm1.896-6.63c-.268 0-.505.058-.705.173-.994.573-1.17 2.565-.485 5.253a25.122 25.122 0 013.233-.501 24.847 24.847 0 012.052-2.544c-1.56-1.519-3.037-2.381-4.095-2.381zm9.589 20.362c-.001 0-.001 0 0 0-1.425 0-3.255-1.073-5.154-3.023l-.34-.349.34-.349a23.53 23.53 0 002.421-2.968l.135-.193.234-.02a23.63 23.63 0 003.787-.609l.472-.119.134.468c.987 3.484.688 5.983-.824 6.854a2.38 2.38 0 01-1.205.308zm-4.096-3.381c1.56 1.519 3.037 2.381 4.095 2.381h.001c.267 0 .505-.058.704-.173.994-.573 1.171-2.566.485-5.254a25.02 25.02 0 01-3.234.501 24.674 24.674 0 01-2.051 2.545zM18.69 8.945l-.472-.119a23.479 23.479 0 00-3.787-.61l-.234-.02-.135-.193a23.414 23.414 0 00-2.421-2.967l-.34-.349.34-.349C14.135 1.778 16.515.767 18 1.622c1.512.872 1.812 3.37.824 6.855l-.134.468zM14.75 7.24c1.142.104 2.227.273 3.234.501.686-2.688.509-4.68-.485-5.253-.988-.571-2.845.304-4.8 2.208A24.849 24.849 0 0114.75 7.24zM7.206 22.677A2.38 2.38 0 016 22.369c-1.512-.871-1.812-3.369-.823-6.854l.132-.468.472.119c1.155.291 2.429.496 3.785.609l.235.02.134.193a23.596 23.596 0 002.422 2.968l.34.349-.34.349c-1.898 1.95-3.728 3.023-5.151 3.023zm-1.19-6.427c-.686 2.688-.509 4.681.485 5.254.987.563 2.843-.305 4.8-2.208a24.998 24.998 0 01-2.052-2.545 24.976 24.976 0 01-3.233-.501zm5.984.628c-.823 0-1.669-.036-2.516-.106l-.235-.02-.135-.193a30.388 30.388 0 01-1.35-2.122 30.354 30.354 0 01-1.166-2.228l-.1-.213.1-.213a30.3 30.3 0 011.166-2.228c.414-.716.869-1.43 1.35-2.122l.135-.193.235-.02a29.785 29.785 0 015.033 0l.234.02.134.193a30.006 30.006 0 012.517 4.35l.101.213-.101.213a29.6 29.6 0 01-2.517 4.35l-.134.193-.234.02c-.847.07-1.694.106-2.517.106zm-2.197-1.084c1.48.111 2.914.111 4.395 0a29.006 29.006 0 002.196-3.798 28.585 28.585 0 00-2.197-3.798 29.031 29.031 0 00-4.394 0 28.477 28.477 0 00-2.197 3.798 29.114 29.114 0 002.197 3.798z" />
    </svg>
  );
}

function TailwindLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
    </svg>
  );
}

function NextJsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z" />
    </svg>
  );
}

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 22.525H0l12-21.05 12 21.05z" />
    </svg>
  );
}

function GitLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187" />
    </svg>
  );
}

function TypeScriptLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" />
    </svg>
  );
}

function VSCodeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 00-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 00-1.276.057L.327 7.261A1 1 0 00.326 8.74L3.899 12 .326 15.26a1 1 0 00.001 1.479L1.65 17.94a.999.999 0 001.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 001.704.29l4.942-2.377A1.5 1.5 0 0024 20.06V3.939a1.5 1.5 0 00-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
    </svg>
  );
}

function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128-4.72-2.75v-.39l5.407 3.03v.475l-5.407 3.03v-.39zm8.735-.063l5.407-3.03v-.39l-5.407-3.03v.39l4.72 2.75.08.128-.08.23-4.72 2.647v.305zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  );
}

function ThreeJsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M.38 0a.268.268 0 0 0-.256.332l2.894 11.716a.268.268 0 0 0 .01.04l2.89 11.708a.268.268 0 0 0 .447.128L23.802 7.15a.268.268 0 0 0-.112-.45l-5.784-1.667a.268.268 0 0 0-.123-.035L6.38 1.715a.268.268 0 0 0-.144-.04L.456.01A.268.268 0 0 0 .38 0zm.374.654L5.71 2.08 1.99 5.664zM6.61 2.34l4.864 1.4-3.65 3.515zm-.522.12l1.217 4.926-4.263.09zm6.028 1.747l4.976 1.434-3.397 3.272zm-.524.12l1.03 4.259-3.809.398zm6.2 1.792l4.532 1.306-3.16 3.044zm-.522.119l.905 3.738-3.378.353zm-11.203.06l3.64-.077-3.012 2.905zm5.256-.112l3.49-.365-2.725 2.625zm5.478-.572l3.024-.316-2.44 2.35zm-7.582 3.273l3.64-.38-2.78 2.679zm-5.476.114l3.64-.076-3.012 2.904zm11.232-.86l2.67-.279-2.199 2.118zm-5.756.746l3.49-.365-2.726 2.625zM3.442 10.11l3.64-.076-3.012 2.904zm5.257-.112l3.49-.365-2.725 2.625zm5.255-.113l3.49-.365-2.725 2.625zm-7.749 3.158l3.64-.076-3.012 2.904zm5.257-.112l3.49-.365-2.725 2.625zm-2.737 3.044l3.64-.076-3.012 2.904z" />
    </svg>
  );
}

function SupabaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" />
    </svg>
  );
}

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

function SanityLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7.394 5.49c0 2.163 1.35 3.46 4.09 4.322l2.913.904c2.705.86 4.353 2.204 4.353 4.926 0 1.486-.516 2.74-1.478 3.692v.001l.004.004A6.028 6.028 0 0 1 12.027 21c-2.93 0-5.395-1.375-6.36-3.95l3.054-1.324c.587 1.29 1.757 2.041 3.306 2.041 1.513 0 2.741-.86 2.741-2.332 0-1.456-.87-2.179-3.127-2.928l-1.057-.358-1.636-.56c-2.358-.83-4.018-2.1-4.018-4.793C4.93 4.348 7.32 3 10.303 3c2.685 0 4.783 1.272 5.798 3.523l-3.02 1.358c-.584-1.22-1.583-1.833-2.778-1.833-1.35 0-2.308.767-2.308 2.058z" />
    </svg>
  );
}

// ============================================================================
// FLOATING TECH ICON COMPONENT
// ============================================================================

interface FloatingIconProps {
  icon: React.ReactNode;
  label: string;
  delay?: number;
  duration?: number;
  x: number;
  y: number;
  size?: "sm" | "md" | "lg";
}

function FloatingIcon({
  icon,
  label,
  delay = 0,
  duration = 4,
  x,
  y,
  size = "md",
}: FloatingIconProps) {
  const sizeClasses = {
    sm: "h-8 w-8 p-1.5",
    md: "h-12 w-12 p-2.5",
    lg: "h-16 w-16 p-3",
  };

  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0.4, 0.8, 0.4],
        scale: [0.95, 1.05, 0.95],
        y: [0, -10, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div
        className={`${sizeClasses[size]} rounded-xl border border-neutral-700/50 bg-neutral-800/80 text-neutral-400 backdrop-blur-sm transition-colors hover:border-neutral-600 hover:text-neutral-200`}
        title={label}
      >
        {icon}
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATED SECTION WRAPPER
// ============================================================================

function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.section>
  );
}

// ============================================================================
// TECH STACK MARQUEE
// ============================================================================

function TechMarquee() {
  const technologies = [
    // Required
    { icon: <ReactLogo className="h-5 w-5" />, name: "React", color: "text-cyan-400" },
    { icon: <TailwindLogo className="h-5 w-5" />, name: "Tailwind", color: "text-sky-400" },
    { icon: <VercelLogo className="h-5 w-5" />, name: "Vercel", color: "text-white" },
    { icon: <GitLogo className="h-5 w-5" />, name: "Git", color: "text-orange-400" },
    // Nice to have
    { icon: <NextJsLogo className="h-5 w-5" />, name: "Next.js", color: "text-white" },
    { icon: <TypeScriptLogo className="h-5 w-5" />, name: "TypeScript", color: "text-blue-400" },
    { icon: <SupabaseLogo className="h-5 w-5" />, name: "Supabase", color: "text-emerald-400" },
    { icon: <StripeLogo className="h-5 w-5" />, name: "Stripe", color: "text-purple-400" },
    { icon: <SanityLogo className="h-5 w-5" />, name: "Sanity", color: "text-red-400" },
    { icon: <ThreeJsLogo className="h-5 w-5" />, name: "Three.js", color: "text-white" },
    { icon: <ClaudeLogo className="h-5 w-5" />, name: "Claude Code", color: "text-orange-300" },
  ];

  return (
    <div className="relative overflow-hidden py-4">
      {/* Gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-neutral-950 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-neutral-950 to-transparent" />

      <motion.div
        className="flex gap-8"
        animate={{ x: [0, -1000] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {[...technologies, ...technologies, ...technologies].map((tech, i) => (
          <div
            key={i}
            className={`flex shrink-0 items-center gap-2 ${tech.color}`}
          >
            {tech.icon}
            <span className="text-sm font-medium">{tech.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ============================================================================
// CONTENT
// ============================================================================

const content = {
  en: {
    badge: "Remote Position",
    title: "Frontend Developer",
    subtitle:
      "Join SALT Studio and help build beautiful websites for premium clients",
    location: "Brazil (Remote)",
    type: "Contract or Part-time",

    aboutTitle: "About the Role",
    aboutText:
      "We're building an AI-powered website generation system that gets client projects 70% of the way there. We need a skilled frontend developer to handle the final 30% — polishing, customizing, and deploying production-ready websites.",

    whatYouWillDo: "What You'll Do",
    tasks: [
      "Take AI-generated Next.js projects and bring them to production quality",
      "Integrate real client content (copy, images, branding)",
      "Add client-specific features (contact forms, chat widgets, analytics)",
      "Fix responsive edge cases and cross-browser issues",
      "Deploy sites to Vercel and configure custom domains",
      "Document customizations for client handoff",
    ],

    requirementsTitle: "Requirements",
    requirements: [
      "React + Tailwind CSS proficiency",
      "UX development & design sensibility",
      "Basic Git workflow (pull, commit, push, PRs)",
      "Experience deploying to Vercel or Netlify",
      "Comfortable reading and modifying existing code",
      "Good English communication (async)",
      "Based in Brazil",
    ],

    niceToHave: "Nice to Have",
    bonuses: [
      "Next.js App Router experience",
      "TypeScript familiarity",
      "Supabase, Stripe, or Sanity.io experience",
      "3D development (Three.js, Spline, or AI-generated 3D)",
      "Agency or studio experience",
      "Experience with AI coding tools (Claude Code)",
    ],

    techStack: "Tech Stack",

    examplesTitle: "Projects Like These",
    examplesSubtitle: "The type of websites you'd help bring to life",

    ctaTitle: "Interested?",
    ctaText:
      "Send a message on WhatsApp with a brief intro and link to your portfolio or GitHub.",
    ctaButton: "Message on WhatsApp",
  },
  pt: {
    badge: "Vaga Remota",
    title: "Desenvolvedor Frontend",
    subtitle:
      "Junte-se ao SALT Studio e ajude a construir sites incríveis para clientes premium",
    location: "Brasil (Remoto)",
    type: "Contrato ou Meio Período",

    aboutTitle: "Sobre a Vaga",
    aboutText:
      "Estamos construindo um sistema de geração de sites com IA que leva projetos de clientes a 70% do caminho. Precisamos de um desenvolvedor frontend habilidoso para cuidar dos 30% finais — polimento, customização e deploy de sites prontos para produção.",

    whatYouWillDo: "O Que Você Vai Fazer",
    tasks: [
      "Pegar projetos Next.js gerados por IA e levá-los à qualidade de produção",
      "Integrar conteúdo real do cliente (textos, imagens, branding)",
      "Adicionar funcionalidades específicas (formulários, chat, analytics)",
      "Corrigir problemas de responsividade e compatibilidade entre navegadores",
      "Fazer deploy no Vercel e configurar domínios personalizados",
      "Documentar customizações para entrega ao cliente",
    ],

    requirementsTitle: "Requisitos",
    requirements: [
      "Proficiência em React + Tailwind CSS",
      "Desenvolvimento UX & sensibilidade para design",
      "Workflow básico de Git (pull, commit, push, PRs)",
      "Experiência com deploy no Vercel ou Netlify",
      "Confortável lendo e modificando código existente",
      "Boa comunicação em inglês (assíncrona)",
      "Baseado no Brasil",
    ],

    niceToHave: "Diferenciais",
    bonuses: [
      "Experiência com Next.js App Router",
      "Familiaridade com TypeScript",
      "Experiência com Supabase, Stripe ou Sanity.io",
      "Desenvolvimento 3D (Three.js, Spline, ou 3D gerado por IA)",
      "Experiência em agência ou estúdio",
      "Experiência com ferramentas de IA (Claude Code)",
    ],

    techStack: "Stack Tecnológica",

    examplesTitle: "Projetos Como Estes",
    examplesSubtitle: "O tipo de site que você ajudaria a criar",

    ctaTitle: "Interessado?",
    ctaText:
      "Envie uma mensagem no WhatsApp com uma breve apresentação e link para seu portfólio ou GitHub.",
    ctaButton: "Mensagem no WhatsApp",
  },
};

const WHATSAPP_NUMBER = "19714421291";
const WHATSAPP_MESSAGE_EN =
  "Hi! I'm interested in the Frontend Developer position at SALT Studio.";
const WHATSAPP_MESSAGE_PT =
  "Olá! Tenho interesse na vaga de Desenvolvedor Frontend no SALT Studio.";

const EXAMPLE_PROJECTS = [
  {
    name: "This Was Major",
    url: "https://thiswasmajor.com/",
    description: { en: "Creative agency portfolio", pt: "Portfólio de agência criativa" },
  },
  {
    name: "Base Church",
    url: "https://www.base.church/",
    description: { en: "Modern church website", pt: "Site moderno de igreja" },
  },
  {
    name: "Maxima Therapy",
    url: "https://maximatherapy.com/",
    description: { en: "Healthcare & therapy practice", pt: "Clínica de saúde e terapia" },
  },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function FrontendDeveloperPage() {
  const [lang, setLang] = useState<"en" | "pt">("pt");
  const t = content[lang];

  const whatsappMessage =
    lang === "en" ? WHATSAPP_MESSAGE_EN : WHATSAPP_MESSAGE_PT;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800/50">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-end px-4">
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "pt" : "en")}
            className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 transition-all hover:border-neutral-600 hover:text-neutral-100"
          >
            <Globe className="h-4 w-4" />
            {lang === "en" ? "PT" : "EN"}
          </button>
        </div>
      </header>

      {/* Hero Section with Floating Icons */}
      <div className="relative overflow-hidden border-b border-neutral-800/50">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />

        {/* Floating Tech Icons */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <FloatingIcon
            icon={<ReactLogo className="h-full w-full" />}
            label="React"
            x={8}
            y={20}
            delay={0}
            duration={5}
            size="lg"
          />
          <FloatingIcon
            icon={<TailwindLogo className="h-full w-full" />}
            label="Tailwind"
            x={85}
            y={15}
            delay={0.5}
            duration={4.5}
            size="md"
          />
          <FloatingIcon
            icon={<NextJsLogo className="h-full w-full" />}
            label="Next.js"
            x={5}
            y={60}
            delay={1}
            duration={5.5}
            size="md"
          />
          <FloatingIcon
            icon={<VercelLogo className="h-full w-full" />}
            label="Vercel"
            x={90}
            y={55}
            delay={1.5}
            duration={4}
            size="sm"
          />
          <FloatingIcon
            icon={<GitLogo className="h-full w-full" />}
            label="Git"
            x={15}
            y={80}
            delay={2}
            duration={4.8}
            size="sm"
          />
          <FloatingIcon
            icon={<TypeScriptLogo className="h-full w-full" />}
            label="TypeScript"
            x={80}
            y={80}
            delay={2.5}
            duration={5.2}
            size="md"
          />
        </div>

        {/* Hero Content */}
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:py-20 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 sm:px-4 sm:py-1.5 sm:text-sm"
            >
              {t.badge}
            </motion.span>

            {/* Title */}
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:mt-6 sm:text-5xl lg:text-6xl">
              {t.title}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-400 sm:mt-4 sm:text-xl">
              {t.subtitle}
            </p>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500 sm:mt-6 sm:gap-4 sm:text-sm">
              <span>{t.location}</span>
              <span className="text-neutral-700">•</span>
              <span>{t.type}</span>
            </div>
          </motion.div>
        </div>

        {/* Tech Marquee */}
        <div className="border-t border-neutral-800/50 bg-neutral-900/30">
          <div className="mx-auto max-w-4xl">
            <TechMarquee />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* About */}
        <AnimatedSection className="mb-10 sm:mb-12">
          <h2 className="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl">{t.aboutTitle}</h2>
          <p className="text-base leading-relaxed text-neutral-300 sm:text-lg">
            {t.aboutText}
          </p>
        </AnimatedSection>

        {/* What You'll Do */}
        <AnimatedSection className="mb-10 sm:mb-12" delay={0.1}>
          <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">{t.whatYouWillDo}</h2>
          <ul className="space-y-3 sm:space-y-4">
            {t.tasks.map((task, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 text-sm text-neutral-300 sm:text-base"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 sm:mt-2.5" />
                {task}
              </motion.li>
            ))}
          </ul>
        </AnimatedSection>

        {/* Requirements & Nice to Have Grid */}
        <div className="mb-10 grid gap-8 sm:mb-12 md:grid-cols-2">
          {/* Requirements */}
          <AnimatedSection delay={0.2}>
            <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">{t.requirementsTitle}</h2>
            <ul className="space-y-3 sm:space-y-4">
              {t.requirements.map((req, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-sm text-neutral-300 sm:text-base"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500 sm:mt-2.5" />
                  {req}
                </motion.li>
              ))}
            </ul>
          </AnimatedSection>

          {/* Nice to Have */}
          <AnimatedSection delay={0.3}>
            <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">{t.niceToHave}</h2>
            <ul className="space-y-3 sm:space-y-4">
              {t.bonuses.map((bonus, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-sm text-neutral-400 sm:text-base"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-700 sm:mt-2.5" />
                  {bonus}
                </motion.li>
              ))}
            </ul>
          </AnimatedSection>
        </div>

        {/* Tech Stack Visual */}
        <AnimatedSection className="mb-10 sm:mb-12" delay={0.4}>
          <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">{t.techStack}</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
            {[
              // Required
              { icon: <ReactLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "React", color: "text-cyan-400" },
              { icon: <TailwindLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Tailwind CSS", color: "text-sky-400" },
              { icon: <VercelLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Vercel", color: "text-white" },
              { icon: <GitLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Git", color: "text-orange-400" },
              // Nice to have
              { icon: <NextJsLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Next.js", color: "text-white" },
              { icon: <TypeScriptLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "TypeScript", color: "text-blue-400" },
              { icon: <SupabaseLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Supabase", color: "text-emerald-400" },
              { icon: <StripeLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Stripe", color: "text-purple-400" },
              { icon: <SanityLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Sanity", color: "text-red-400" },
              { icon: <ThreeJsLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Three.js", color: "text-white" },
              { icon: <ClaudeLogo className="h-5 w-5 sm:h-6 sm:w-6" />, name: "Claude Code", color: "text-orange-300" },
            ].map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="group flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50 sm:gap-3 sm:rounded-xl sm:p-4"
              >
                <span className={`${tech.color} transition-transform group-hover:scale-110`}>
                  {tech.icon}
                </span>
                <span className="text-xs font-medium text-neutral-300 sm:text-sm">
                  {tech.name}
                </span>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* Example Projects */}
        <AnimatedSection className="mb-10 sm:mb-12" delay={0.45}>
          <h2 className="mb-2 text-xl font-semibold sm:text-2xl">{t.examplesTitle}</h2>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">{t.examplesSubtitle}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {EXAMPLE_PROJECTS.map((project, i) => (
              <motion.a
                key={project.url}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 transition-all hover:border-neutral-600 hover:bg-neutral-800/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-100 group-hover:text-white">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {project.description[lang]}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-all group-hover:bg-emerald-500/20 group-hover:text-emerald-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 text-xs text-neutral-600 group-hover:text-neutral-500">
                  {project.url.replace('https://', '').replace('www.', '').replace(/\/$/, '')}
                </div>
              </motion.a>
            ))}
          </div>
        </AnimatedSection>

        {/* CTA */}
        <AnimatedSection delay={0.5}>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-900/50 p-6 sm:rounded-2xl sm:p-10"
          >
            <h2 className="mb-2 text-xl font-semibold sm:mb-3 sm:text-2xl">{t.ctaTitle}</h2>
            <p className="mb-6 text-sm text-neutral-400 sm:mb-8 sm:text-base">{t.ctaText}</p>
            <Button
              asChild
              size="lg"
              className="w-full bg-emerald-600 text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 sm:w-auto"
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                {t.ctaButton}
              </a>
            </Button>
          </motion.div>
        </AnimatedSection>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8 text-center text-sm text-neutral-500">
        SALT Studio
      </footer>
    </div>
  );
}
