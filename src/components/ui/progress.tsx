import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: "primary" | "secondary" | "accent" | "destructive";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, color = "primary", size = "default", showLabel, ...props }, ref) => {
    const percentage = Math.min(Math.round((value / max) * 100), 100);

    const colors: Record<string, string> = {
      primary: "bg-[var(--color-progress)]",
      secondary: "bg-[var(--color-brand)]",
      accent: "bg-[var(--color-completion)]",
      destructive: "bg-[var(--color-alert)]",
    };

    const heights: Record<string, string> = {
      sm: "h-1.5",
      default: "h-2",
      lg: "h-3",
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1.5">
            <span className="font-semibold tabular-nums">{percentage}%</span>
          </div>
        )}
        <div className={cn("w-full rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] overflow-hidden p-0.5", heights[size])}>
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative",
              colors[color],
              percentage > 85 && "shadow-[0_0_8px_currentColor]"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
