import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase transition-colors border",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted/60 text-foreground",
        success:
          "border-success/30 bg-success/10 text-success",
        warning:
          "border-accent/40 bg-accent/15 text-accent-foreground",
        danger:
          "border-danger/30 bg-danger/10 text-danger",
        info:
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
        live:
          "border-danger/50 bg-danger/15 text-danger animate-pulse",
        gold:
          "border-accent bg-accent/20 text-accent font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  const dotColorClass =
    variant === "success"
      ? "bg-success"
      : variant === "warning" || variant === "gold"
      ? "bg-accent"
      : variant === "danger" || variant === "live"
      ? "bg-danger"
      : variant === "info"
      ? "bg-sky-500"
      : "bg-muted-foreground";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColorClass)} />}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };
