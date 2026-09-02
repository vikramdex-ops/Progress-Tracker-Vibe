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
}

export function StatCard({ icon, label, value, color = "progress", className, ...props }: StatCardProps) {
  return (
    <Card className={cn("p-4 lg:p-5 bg-[var(--color-surface-default)]", className)} {...props}>
      <div className="flex items-center gap-3 lg:gap-4">
        <div className={cn("w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", tintMap[color])}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xl lg:text-2xl font-extrabold text-[var(--color-text-primary)] tabular-nums leading-none">
            {value}
          </div>
          <div className="text-[10px] lg:text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest leading-tight mt-1">
            {label}
          </div>
        </div>
      </div>
    </Card>
  );
}
