import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-default)] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

    const variants: Record<string, string> = {
      default: "bg-[var(--color-progress)] text-white hover:brightness-105 active:brightness-95 shadow-sm hover:shadow-[var(--shadow-glow-progress)]",
      secondary: "bg-[var(--color-brand)] text-white hover:brightness-105 active:brightness-95 shadow-sm hover:shadow-[var(--shadow-glow-brand)]",
      ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]",
      destructive: "bg-[var(--color-alert)] text-white hover:brightness-105 active:brightness-95 shadow-sm",
      outline: "border border-[var(--color-border)] bg-[var(--color-surface-default)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]",
      success: "bg-[var(--color-completion)] text-white hover:brightness-105 active:brightness-95 shadow-sm hover:shadow-[var(--shadow-glow-completion)]",
    };

    const sizes: Record<string, string> = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9 rounded-lg p-0",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
