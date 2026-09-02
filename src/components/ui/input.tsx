import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)]",
          "px-4 py-2.5 text-sm text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-tertiary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]/30 focus-visible:border-[var(--color-border-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-[var(--duration-fast)]",
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
