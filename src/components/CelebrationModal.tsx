import { useEffect, useState } from "react";
import { Star, Flame, Trophy } from "lucide-react";

interface Props {
  xp: number;
  streak: number;
  newBadges?: string[];
  onClose: () => void;
}

const CONFETTI_COLORS = ["#f59e0b", "#f97316", "#ef4444", "#10b981", "#6366f1", "#8b5cf6", "#ec4899"];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.6;
  const size = 6 + Math.random() * 6;
  const duration = 2 + Math.random() * 2;

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${left}%`,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
        opacity: 0,
      }}
    />
  );
}

export default function CelebrationModal({ xp, streak, newBadges = [], onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
      />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Modal */}
      <div
        className="relative bg-[var(--color-surface)] rounded-3xl p-8 sm:p-10 text-center shadow-(--shadow-elevated) max-w-sm mx-4 border border-[var(--color-border)]/50"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.2s cubic-bezier(0.20, 0.00, 0.00, 1.00)",
        }}
      >
        {/* Glow ring */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 rounded-3xl opacity-20 blur-xl animate-pulse" />

        <div className="relative">
          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl bg-(--color-progress) flex items-center justify-center mx-auto mb-5 shadow-elevated">
            <span className="text-4xl">🎉</span>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">EOD Submitted!</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2.5 text-amber-500 font-bold text-lg">
              <Star className="w-5 h-5 fill-amber-400" /> +{xp} XP
            </div>
            {streak > 1 && (
              <div className="flex items-center justify-center gap-2.5 text-orange-500 font-bold">
                <Flame className="w-5 h-5" /> {streak}-Day Streak 🔥
              </div>
            )}
            {newBadges.length > 0 && (
              <div className="flex items-center justify-center gap-2.5 text-yellow-500 font-bold">
                <Trophy className="w-5 h-5" /> Badge{newBadges.length > 1 ? "s" : ""} Unlocked!
              </div>
            )}
          </div>

          {/* Progress bar auto-close */}
          <div className="mt-6 h-1 w-full rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
              style={{
                animation: "progress-bar 3.5s linear forwards",
                width: "100%",
                transformOrigin: "left",
              }}
            />
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2 font-medium">Closing automatically...</p>
        </div>
      </div>
    </div>
  );
}
