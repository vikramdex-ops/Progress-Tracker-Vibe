import { useEffect, useState, useRef } from "react";
import { Star, Flame, Trophy } from "lucide-react";

interface Props {
  xp: number;
  streak: number;
  newBadges?: string[];
  onClose: () => void;
}

const CONFETTI_COLORS = ["oklch(0.66 0.175 70)", "oklch(0.64 0.16 160)", "oklch(0.65 0.205 25)", "oklch(0.55 0.17 264)"];

// Physics confetti — canvas 60fps, respects reduced-motion
function PhysicsConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = (canvas.width = canvas.clientWidth * dpr);
    let h = (canvas.height = canvas.clientHeight * dpr);
    const onResize = () => {
      w = canvas.width = canvas.clientWidth * dpr;
      h = canvas.height = canvas.clientHeight * dpr;
    };
    window.addEventListener("resize", onResize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; color: string; shape: number; life: number };
    const particles: P[] = [];
    for (let i = 0; i < 42; i++) {
      particles.push({
        x: (Math.random() * 0.6 + 0.2) * w,
        y: -10 * dpr,
        vx: (Math.random() - 0.5) * 6 * dpr,
        vy: Math.random() * 4 * dpr + 2 * dpr,
        r: (6 + Math.random() * 7) * dpr,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape: Math.random() > 0.5 ? 0 : 1,
        life: 1,
      });
    }

    let raf = 0;
    let t = 0;
    const gravity = 0.18 * dpr;
    const drag = 0.998;
    const animate = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20 * dpr) p.life = 0;
        else alive++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - t / 260);
        if (p.shape === 0) {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0 && t < 320) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - spec §5.11 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-[var(--duration-fast)]"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
      />

      {/* Physics confetti — canvas 60fps */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <PhysicsConfetti />
      </div>

      {/* Modal - spec §5.11 centered dialog */}
      <div
        className="relative bg-[var(--color-surface-overlay)] rounded-2xl p-8 sm:p-10 text-center shadow-elevated max-w-sm w-full border border-[var(--color-border)]"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
          opacity: visible ? 1 : 0,
          transition: "all var(--duration-slow) var(--ease-spring)",
          boxShadow: "0 0 24px color-mix(in oklch, var(--color-progress), transparent 70%), var(--shadow-elevated)",
        }}
      >
        <div className="relative">
          {/* Icon - flat progress fill, no gradient */}
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-progress)] flex items-center justify-center mx-auto mb-5 shadow-elevated">
            <span className="text-4xl">🎉</span>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">EOD Submitted!</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2.5 text-[var(--color-progress)] font-bold text-lg">
              <Star className="w-5 h-5 fill-[var(--color-progress)]" /> +{xp} XP
            </div>
            {streak > 1 && (
              <div className="flex items-center justify-center gap-2.5 text-[var(--color-progress)] font-bold">
                <Flame className="w-5 h-5" /> {streak}-Day Streak 🔥
              </div>
            )}
            {newBadges.length > 0 && (
              <div className="flex items-center justify-center gap-2.5 text-[var(--color-progress)] font-bold">
                <Trophy className="w-5 h-5" /> Badge{newBadges.length > 1 ? "s" : ""} Unlocked!
              </div>
            )}
          </div>

          {/* Progress bar auto-close - flat */}
          <div className="mt-6 h-1 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-progress)]"
              style={{
                animation: "progress-bar 3.5s linear forwards",
                width: "100%",
                transformOrigin: "left",
              }}
            />
          </div>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 font-medium">Closing automatically...</p>
        </div>
      </div>
    </div>
  );
}
