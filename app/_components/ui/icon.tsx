"use client";

import { cn } from "@repo/utils";
import { LucideIcon, LucideProps } from "lucide-react";
import { motion, HTMLMotionProps, Variants, useReducedMotion } from "framer-motion";
import { forwardRef } from "react";

/**
 * Icon size scale following Salt design system
 * Reference: docs/guides/icon-system.md
 */
const iconSizes = {
  xs: "size-3",      // 12px - badges, status dots
  sm: "size-3.5",    // 14px - dense lists
  md: "size-4",      // 16px - default
  lg: "size-4.5",    // 18px - navigation
  xl: "size-5",      // 20px - section headers, collapsed nav
  "2xl": "size-6",   // 24px - hero sections
} as const;

/**
 * Default stroke widths per size for optimal visibility
 */
const defaultStrokeWidth: Record<keyof typeof iconSizes, number> = {
  xs: 1.5,
  sm: 1.5,
  md: 1.75,
  lg: 1.75,
  xl: 1.75,
  "2xl": 2,
};

/**
 * Animation variants for important icons
 */
const animationVariants: Record<string, Variants> = {
  spin: {
    animate: {
      rotate: 360,
    },
  },
  pulse: {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [1, 0.8, 1],
    },
  },
  bounce: {
    animate: {
      y: [0, -4, 0],
    },
  },
  shake: {
    animate: {
      x: [0, -3, 3, -3, 3, 0],
    },
  },
  "scale-in": {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  },
  "fade-in": {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  ping: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1],
    },
  },
};

/**
 * Animation timing configurations
 */
const animationTransitions: Record<string, object> = {
  spin: {
    repeat: Infinity,
    duration: 1,
    ease: "linear",
  },
  pulse: {
    repeat: Infinity,
    duration: 2,
    ease: "easeInOut",
  },
  bounce: {
    repeat: Infinity,
    duration: 0.6,
    ease: "easeOut",
    repeatDelay: 2,
  },
  shake: {
    duration: 0.4,
    ease: "easeInOut",
  },
  "scale-in": {
    duration: 0.2,
    ease: [0.16, 1, 0.3, 1], // ease-out-expo
  },
  "fade-in": {
    duration: 0.2,
    ease: "easeOut",
  },
  ping: {
    repeat: Infinity,
    duration: 1.5,
    ease: "easeInOut",
    repeatDelay: 1,
  },
};

export type IconSize = keyof typeof iconSizes;
export type IconAnimation = keyof typeof animationVariants;
export type IconVariant = "outline" | "filled";

/**
 * Icons that work well as filled (tested)
 * Reference: https://lucide.dev/guide/advanced/filled-icons
 */
const FILLABLE_ICONS = new Set([
  "Star", "Heart", "Circle", "Square", "Triangle", "Pentagon", "Hexagon", "Octagon",
  "Bell", "Bookmark", "Flag", "Home", "Mail", "MapPin", "Moon", "Sun", "Cloud",
  "Folder", "File", "FileText", "Calendar", "Clock", "CheckCircle", "XCircle",
  "AlertCircle", "Info", "HelpCircle", "User", "Users", "Settings", "Cog",
  "Shield", "Lock", "Unlock", "Eye", "EyeOff", "Trash", "Trash2", "Archive",
  "Inbox", "Send", "MessageCircle", "MessageSquare", "ThumbsUp", "ThumbsDown",
  "Zap", "Flame", "Droplet", "Lightbulb", "Gift", "Tag", "Hash", "AtSign",
  "Play", "Pause", "Stop", "FastForward", "Rewind", "SkipForward", "SkipBack",
  "Volume", "Volume1", "Volume2", "VolumeX", "Mic", "MicOff", "Camera", "Video",
  "Image", "Film", "Music", "Headphones", "Radio", "Tv", "Monitor", "Smartphone",
  "Tablet", "Laptop", "Watch", "Cpu", "HardDrive", "Database", "Server", "Wifi",
  "Bluetooth", "Battery", "BatteryCharging", "BatteryFull", "BatteryLow",
  "Download", "Upload", "CloudDownload", "CloudUpload", "Share", "Share2",
  "Link", "Link2", "Anchor", "Paperclip", "Scissors", "Copy", "Clipboard",
  "Edit", "Edit2", "Edit3", "Pen", "Pencil", "Highlighter", "Eraser",
  "Save", "Printer", "Search", "ZoomIn", "ZoomOut", "Filter", "Layers",
  "Layout", "Grid", "List", "AlignLeft", "AlignCenter", "AlignRight", "AlignJustify",
  "Bold", "Italic", "Underline", "Strikethrough", "Type", "Quote",
  "Code", "Terminal", "FileCode", "Braces", "Binary", "Bug", "GitBranch", "GitCommit",
  "Box", "Package", "Briefcase", "ShoppingBag", "ShoppingCart", "CreditCard",
  "DollarSign", "Percent", "PieChart", "BarChart", "LineChart", "TrendingUp", "TrendingDown",
  "Activity", "Target", "Award", "Medal", "Trophy", "Crown", "Gem", "Diamond",
  "Sparkle", "Sparkles", "Wand", "Wand2", "Magic", "Rocket", "Plane", "Car", "Truck",
  "Ship", "Train", "Bus", "Bike", "Navigation", "Navigation2", "Compass", "Map",
  "Globe", "Globe2", "Earth", "Building", "Building2", "Store", "Factory", "Warehouse",
  "Hospital", "Church", "School", "University", "Library", "Museum", "Bank",
  "Coffee", "Pizza", "Apple", "Cherry", "Grape", "Banana", "Carrot", "Cookie",
  "IceCream", "Cake", "Wine", "Beer", "Martini", "Cigarette", "Pill", "Syringe",
  "Stethoscope", "Thermometer", "Bandage", "TestTube", "Microscope", "Dna",
  "Atom", "Beaker", "FlaskConical", "FlaskRound", "Gauge", "Ruler", "Calculator",
  "StickyNote", "Notebook", "BookOpen", "Book", "Library", "Newspaper", "Rss",
  "Podcast", "Youtube", "Twitter", "Facebook", "Instagram", "Linkedin", "Github",
  "Gitlab", "Slack", "Discord", "Figma", "Framer", "Dribbble", "Behance"
]);

interface IconProps extends Omit<LucideProps, "ref"> {
  /** The Lucide icon component */
  icon: LucideIcon;
  /** Icon size following design system scale */
  size?: IconSize;
  /** Icon variant - outline (default) or filled (Linear-style) */
  variant?: IconVariant;
  /** Animation type for important icons */
  animation?: IconAnimation;
  /** Override stroke width (defaults based on size, ignored for filled) */
  strokeWidth?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Icon - Consistent icon wrapper with design system defaults
 *
 * Features:
 * - Consistent sizing scale (xs through 2xl)
 * - Optimized stroke width per size
 * - Optional animations for important icons
 * - Respects prefers-reduced-motion
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Icon icon={Settings} size="md" />
 *
 * // With animation
 * <Icon icon={Loader2} size="md" animation="spin" />
 *
 * // Success feedback
 * <Icon icon={Check} size="md" animation="scale-in" className="text-green-500" />
 * ```
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      icon: LucideIcon,
      size = "md",
      variant = "outline", // Default to outline
      animation,
      strokeWidth,
      className,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const sizeClass = iconSizes[size];

    // For filled variant: use fill and no stroke
    // For outline variant: use stroke width
    const isFilled = variant === "filled";
    const iconProps = isFilled
      ? { fill: "currentColor", strokeWidth: 0 }
      : { strokeWidth: strokeWidth ?? defaultStrokeWidth[size] };

    // If no animation or user prefers reduced motion, render static icon
    if (!animation || prefersReducedMotion) {
      return (
        <LucideIcon
          ref={ref}
          className={cn(sizeClass, className)}
          {...iconProps}
          {...props}
        />
      );
    }

    // Animated icon
    const variants = animationVariants[animation];
    const transition = animationTransitions[animation];

    return (
      <motion.span
        className={cn("inline-flex", className)}
        variants={variants}
        initial={variants.initial ? "initial" : undefined}
        animate="animate"
        transition={transition}
      >
        <LucideIcon
          ref={ref}
          className={sizeClass}
          {...iconProps}
          {...props}
        />
      </motion.span>
    );
  }
);

Icon.displayName = "Icon";

/**
 * AnimatedIcon - Explicit wrapper for icons that need animation
 *
 * Use this when you want to wrap an existing icon with animation
 * without changing the icon itself.
 *
 * @example
 * ```tsx
 * <AnimatedIcon animation="pulse">
 *   <Bell className="size-4" />
 * </AnimatedIcon>
 * ```
 */
interface AnimatedIconProps extends HTMLMotionProps<"span"> {
  animation: IconAnimation;
  children: React.ReactNode;
}

export function AnimatedIcon({
  animation,
  children,
  className,
  ...props
}: AnimatedIconProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = animationVariants[animation];
  const transition = animationTransitions[animation];

  // If user prefers reduced motion, render without animation
  if (prefersReducedMotion) {
    return (
      <span className={cn("inline-flex", className)} {...(props as any)}>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className={cn("inline-flex", className)}
      variants={variants}
      initial={variants.initial ? "initial" : undefined}
      animate="animate"
      transition={transition}
      {...props}
    >
      {children}
    </motion.span>
  );
}
