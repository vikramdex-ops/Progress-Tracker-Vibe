import { useEffect, useRef } from "react";

// Calm Glass overdrive: subtle OKLCH indigo shader — restrained, 60fps, respects reduced-motion
export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth * dpr;
      height = canvas.clientHeight * dpr;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const animate = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Base: flat brand fill already via CSS, shader adds subtle luminous waves on top
      // Use low-opacity oklch-like indigo waves
      const drawWave = (phase: number, amp: number, yBase: number, opacity: number) => {
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += 8) {
          const nx = x / width;
          const y = yBase + Math.sin(nx * Math.PI * 2 + phase) * amp + Math.sin(nx * Math.PI * 4 + phase * 0.7) * amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        // OKLCH indigo 264 hue, low chroma for subtlety
        ctx.fillStyle = `oklch(0.62 0.08 264 / ${opacity})`;
        ctx.fill();
      };

      // Three layered waves — very subtle, 8% max opacity
      drawWave(t, 18 * dpr, height * 0.62, 0.06);
      drawWave(t * 0.7 + 1.2, 24 * dpr, height * 0.72, 0.04);
      drawWave(t * 0.5 + 2.4, 14 * dpr, height * 0.82, 0.03);

      // Subtle grain dots — slow drift
      ctx.fillStyle = "oklch(1 0 0 / 0.04)";
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * width;
        const y = (Math.cos(t * 0.2 + i * 2.3) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(x, y, 0.7 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 1 }}
    />
  );
}
