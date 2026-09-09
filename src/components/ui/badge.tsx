import * as React from "react";
import { cn } from "@/lib/utils";

// Calm Glass §5.4 — 4 intents × 3 styles, semantic tokens only
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  dot?: boolean;
}

const Badge = ({ className, variant = "default", dot, children, ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
    default: "bg-[var(--color-surface-progress)] text-[var(--color-progress)] border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)]",
    secondary: "bg-[var(--color-surface-brand)] text-[var(--color-brand)] border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]",
    success: "bg-[var(--color-surface-completion)] text-[var(--color-completion)] border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)]",
    warning: "bg-[var(--color-surface-progress)] text-[var(--color-warning)] border-[var(--color-amber-200)] dark:border-[var(--color-amber-800)]",
    destructive: "bg-[var(--color-surface-alert)] text-[var(--color-alert)] border-[var(--color-red-200)] dark:border-[var(--color-red-800)]",
    outline: "border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent",
  };

  const dotColors: Record<string, string> = {
    default: "bg-[var(--color-progress)]",
    secondary: "bg-[var(--color-brand)]",
    success: "bg-[var(--color-completion)]",
    warning: "bg-[var(--color-warning)]",
    destructive: "bg-[var(--color-alert)]",
    outline: "bg-[var(--color-text-tertiary)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors duration-[var(--duration-fast)]",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </div>
  );
};

export { Badge };
