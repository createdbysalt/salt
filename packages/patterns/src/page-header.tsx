import { cn } from "@repo/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  /** Remove bottom border */
  noBorder?: boolean;
}

/**
 * Standardized page header component.
 * Typography: 20px, weight 500 (Linear-inspired)
 *
 * @example
 * <PageHeader
 *   title="Projects"
 *   description="Manage your active projects"
 *   actions={<Button>New Project</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  noBorder = false,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "space-y-4 pb-4",
      !noBorder && "border-b border-border",
      className
    )}>
      {breadcrumbs && <div className="text-sm text-muted-foreground">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Linear-inspired: 20px, weight 500, tight tracking */}
          <h1 className="text-[20px] font-[500] tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
