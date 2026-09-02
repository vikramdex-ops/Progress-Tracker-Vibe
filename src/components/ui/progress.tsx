import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: "primary" | "secondary" | "accent" | "destructive";
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, color = "primary", showLabel, ...props }, ref) => {
    const percentage = Math.min(Math.round((value / max) * 100), 100);

    const colors: Record<string, string> = {
      primary: "bg-[var(--color-progress)]",
      secondary: "bg-[var(--color-brand)]",
      accent: "bg-[var(--color-completion)]",
      destructive: "bg-[var(--color-alert)]",
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mb-1.5">
            <span className="font-medium tabular-nums">{percentage}%</span>
          </div>
        )}
        <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)]",
              colors[color]
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
