import { cn } from "@repo/utils";

interface StudioLogoProps {
  /** URL to the logo image */
  logoUrl?: string | null;
  /** Studio name (used for alt text and fallback) */
  name: string;
  /** Accent color for the fallback letter avatar */
  accentColor?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-10 w-10 text-lg",
  lg: "h-16 w-16 text-2xl",
};

const logoSizeClasses = {
  sm: "h-6 w-auto max-w-[80px]",
  md: "h-10 w-auto max-w-[120px]",
  lg: "h-16 w-auto max-w-[180px]",
};

/**
 * Studio logo component with automatic letter avatar fallback.
 *
 * Displays the studio logo if available, otherwise shows a colored
 * circle with the first letter of the studio name.
 */
export function StudioLogo({
  logoUrl,
  name,
  accentColor = "#6366F1",
  size = "md",
  className,
}: StudioLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(logoSizeClasses[size], "object-contain", className)}
      />
    );
  }

  // Fallback: Letter avatar
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center text-white font-semibold shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: accentColor }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Get the appropriate logo URL from branding config.
 * Prefers dark mode logo (for light backgrounds), falls back to light mode.
 */
export function getLogoUrl(branding?: {
  logo?: { darkUrl?: string; lightUrl?: string };
}): string | null {
  return branding?.logo?.darkUrl || branding?.logo?.lightUrl || null;
}
