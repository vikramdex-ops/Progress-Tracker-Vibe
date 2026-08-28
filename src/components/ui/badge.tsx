import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
    default: "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
    secondary: "bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40",
    success: "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    warning: "bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40",
    destructive: "bg-red-50 text-red-500 border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
    outline: "border-[var(--color-border)] text-[var(--color-text-muted)]",
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
