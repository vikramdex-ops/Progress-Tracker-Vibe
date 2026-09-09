import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  subtitle?: string;
  color?: "progress" | "brand" | "completion";
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
  subtitle = "complete",
  color = "progress",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(value, 100));
  const offset = circumference - (clamped / 100) * circumference;

  const colorMap = {
    progress: "var(--color-progress)",
    brand: "var(--color-brand)",
    completion: "var(--color-completion)",
  };

  const strokeColor = colorMap[color];

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity={0.6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            filter: `drop-shadow(0 0 8px color-mix(in oklch, ${strokeColor}, transparent 60%))`,
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tabular-nums tracking-tight">
            {Math.round(clamped)}%
          </span>
          <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mt-0.5">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
