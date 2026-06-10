import { Sparkles } from "lucide-react";
import { cn } from "@repo/utils";

type SaltActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: "primary" | "hero";
};

export function SaltActionButton({
  children,
  variant = "primary",
  className,
  title = "Salt will handle this for you",
  type = "button",
  ...props
}: SaltActionButtonProps) {
  return (
    <button
      type={type}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition",
        variant === "primary" &&
          "h-9 px-3.5 rounded-full bg-foreground text-background text-sm hover:bg-foreground/90",
        variant === "hero" &&
          "h-11 pl-4 pr-5 rounded-full bg-white text-neutral-900 text-sm font-semibold hover-lift",
        className
      )}
      {...props}
    >
      <Sparkles
        className={cn(
          "shrink-0",
          variant === "primary" && "size-3.5",
          variant === "hero" && "size-4 text-flame"
        )}
        strokeWidth={2.25}
      />
      {children}
    </button>
  );
}
