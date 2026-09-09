import { useEffect, useState } from "react";
import { X, Sparkles, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Calm Glass onboarding — first-run empty state + progressive hint
export function OnboardingHint({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === "1");

  if (dismissed) return null;

  return (
    <Card className="border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] bg-[var(--color-surface-brand)] p-5 relative shadow-sm rise-in">
      <button
        onClick={() => {
          localStorage.setItem(storageKey, "1");
          setDismissed(true);
        }}
        className="absolute right-3.5 top-3.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors p-1"
        aria-label="Dismiss guide"
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </Card>
  );
}

export function FirstEodOnboarding() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("onboard-eod") === "1");
  const [step, setStep] = useState(1);

  if (dismissed) return null;

  return (
    <OnboardingHint storageKey="onboard-eod">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand)] flex items-center justify-center flex-shrink-0 shadow-sm text-white">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">
              Welcome to Progress Tracker
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-brand)]">
              Quick Guide
            </span>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
            Record your daily engineering output before <strong>6:00 PM</strong> to build streaks and level up. Early submissions before 5:00 PM get a <strong>+5 XP bonus</strong>, and full planned completion earns <strong>+20 XP</strong>!
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--color-surface-default)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" /> +10 XP Daily EOD
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--color-surface-default)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-xs">
              <Trophy className="w-3.5 h-3.5 text-[var(--color-progress)]" /> Active Streaks
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-3">
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                localStorage.setItem("onboard-eod", "1");
                setDismissed(true);
              }}
            >
              Start My First Entry →
            </Button>
          </div>
        </div>
      </div>
    </OnboardingHint>
  );
}
