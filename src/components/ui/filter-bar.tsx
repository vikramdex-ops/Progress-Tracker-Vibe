import * as React from "react";
import { cn } from "@/lib/utils";

// Calm Glass §5.12 — FilterBar, extracted via /impeccable extract
export function FilterBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 lg:gap-3 p-3 lg:p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
