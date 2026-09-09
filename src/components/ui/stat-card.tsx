import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Calm Glass §5.7 — StatCard compound, extracted via /impeccable extract
export type StatColor = "progress" | "brand" | "completion" | "alert";

const tintMap: Record<StatColor, string> = {
  progress: "bg-[var(--color-surface-progress)] text-[var(--color-progress)]",
  brand: "bg-[var(--color-surface-brand)] text-[var(--color-brand)]",
  completion: "bg-[var(--color-surface-completion)] text-[var(--color-completion)]",
  alert: "bg-[var(--color-surface-alert)] text-[var(--color-alert)]",
};

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: StatColor;
  subtitle?: string;
}

export function StatCard({ icon, label, value, color = "progress", subtitle, className, ...props }: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-4 lg:p-5 bg-[var(--color-surface-default)] card-interactive hover:border-[var(--color-border-strong)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3.5 lg:gap-4">
        <div className={cn("w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105", tintMap[color])}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl lg:text-2xl font-black text-[var(--color-text-primary)] tabular-nums leading-none tracking-tight">
            {value}
          </div>
          <div className="text-[10px] lg:text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider leading-tight mt-1 truncate">
            {label}
          </div>
          {subtitle && (
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
