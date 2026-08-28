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
      primary: "bg-gradient-to-r from-amber-400 to-orange-400",
      secondary: "bg-gradient-to-r from-indigo-400 to-purple-400",
      accent: "bg-gradient-to-r from-emerald-400 to-teal-400",
      destructive: "bg-gradient-to-r from-red-400 to-rose-400",
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
            <span className="font-medium">{percentage}%</span>
          </div>
        )}
        <div className="h-2 w-full rounded-full bg-[var(--color-border-light)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
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
