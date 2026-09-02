import * as React from "react";
import { cn } from "@/lib/utils";

// Calm Glass §5.4 — 4 intents × 3 styles, semantic tokens only
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  // Maps legacy variant names to Calm Glass semantic tokens
  const variants: Record<string, string> = {
    default: "bg-[var(--color-surface-progress)] text-[var(--color-amber-700)] border-[var(--color-amber-200)]",
    secondary: "bg-[var(--color-surface-brand)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]",
    success: "bg-[var(--color-surface-completion)] text-[var(--color-emerald-700)] border-[var(--color-emerald-200)]",
    warning: "bg-[var(--color-surface-progress)] text-[var(--color-amber-700)] border-[var(--color-amber-200)]",
    destructive: "bg-[var(--color-surface-alert)] text-[var(--color-red-700)] border-[var(--color-red-200)]",
    outline: "border-[var(--color-border)] text-[var(--color-text-tertiary)] bg-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };
