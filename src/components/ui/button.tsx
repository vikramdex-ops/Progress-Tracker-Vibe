import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline" | "success";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.97]";

    const variants: Record<string, string> = {
      default: "bg-(--color-progress) text-white hover:brightness-90 shadow-(--shadow-elevated)",
      secondary: "bg-(--color-brand) text-white hover:brightness-90 shadow-(--shadow-elevated)",
      ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]",
      destructive: "bg-(--color-alert) text-white hover:brightness-90 shadow-(--shadow-elevated)",
      outline: "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/30",
      success: "bg-(--color-completion) text-white hover:brightness-90 shadow-(--shadow-elevated)",
    };

    const sizes: Record<string, string> = {
      default: "h-11 px-5 py-2.5 text-sm",
      sm: "h-9 px-3.5 text-xs",
      lg: "h-13 px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
