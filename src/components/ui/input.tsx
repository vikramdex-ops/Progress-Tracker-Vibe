import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-[var(--color-surface-input)]",
          "px-3.5 py-2 text-sm text-[var(--color-text-primary)] shadow-xs",
          "placeholder:text-[var(--color-text-tertiary)]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
          "focus-visible:outline-none focus-visible:ring-2",
          error
            ? "border-[var(--color-alert)] focus-visible:ring-[var(--color-alert)]/30 focus-visible:border-[var(--color-alert)]"
            : "border-[var(--color-border)] focus-visible:ring-[var(--color-border-focus)]/30 focus-visible:border-[var(--color-border-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
