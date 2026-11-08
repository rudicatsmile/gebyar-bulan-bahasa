"use client";

import * as React from "react";

interface RibbonStreamer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  swaySpeed: number;
  swayAmp: number;
  swayPhase: number;
  width: number;
  trail: Array<{ x: number; y: number }>;
  maxTrail: number;
  color: string;
  darkColor: string;
  twist: number;
  twistSpeed: number;
  opacity: number;
  delay: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  opacity: number;
  delay: number;
}

// Pasangan warna pita depan & belakang (simulasi kilau pita 3D bolak-balik)
const RIBBON_COLOR_PAIRS = [
  { front: "#fbbf24", back: "#b45309" }, // Emas Murni / Gold
  { front: "#f59e0b", back: "#78350f" }, // Amber Deep
  { front: "#ef4444", back: "#991b1b" }, // Merah Festival
  { front: "#10b981", back: "#064e3b" }, // Zamrud Hijau
  { front: "#3b82f6", back: "#1e3a8a" }, // Biru Elektrik
  { front: "#ec4899", back: "#831843" }, // Pink Cerah
  { front: "#8b5cf6", back: "#4c1d95" }, // Ungu Kerajaan
  { front: "#06b6d4", back: "#155e75" }, // Cyan Cerah
  { front: "#ffffff", back: "#94a3b8" }, // Putih Perak / Silver
];

const CONFETTI_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#fbbf24",
  "#06b6d4",
  "#ffffff",
];

export function ConfettiCanvas({
  active,
  zIndex = 55,
  className = "",
}: {
  active: boolean;
  zIndex?: number;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ribbons: RibbonStreamer[] = [];
    const confetti: ConfettiPiece[] = [];

    // Helper untuk membuat tembakan pita (meriam pita ke udara)
    const spawnRibbonWave = (delayMs: number, countMultiplier: number = 1.0) => {
      const W = canvas.width;
      const H = canvas.height;

      // 1. Meriam Kiri Bawah (Menembak meliuk ke kanan atas)
      const leftCount = Math.floor(22 * countMultiplier);
      for (let i = 0; i < leftCount; i++) {
        const pair = RIBBON_COLOR_PAIRS[Math.floor(Math.random() * RIBBON_COLOR_PAIRS.length)];
        const angle = (Math.PI * 0.28) + (Math.random() * 0.16); // ~50° - 78°
        const speed = Math.random() * 14 + 22;

        ribbons.push({
          x: Math.random() * (W * 0.12),
          y: H + Math.random() * 20,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          gravity: Math.random() * 0.08 + 0.24,
          drag: 0.982,
          swaySpeed: Math.random() * 0.04 + 0.03,
          swayAmp: Math.random() * 2.2 + 1.2,
          swayPhase: Math.random() * Math.PI * 2,
          width: Math.random() * 5 + 8, // 8px - 13px
          trail: [],
          maxTrail: Math.floor(Math.random() * 10 + 22), // 22 - 32 titik panjang pita
          color: pair.front,
          darkColor: pair.back,
          twist: Math.random() * Math.PI * 2,
          twistSpeed: (Math.random() - 0.5) * 0.14,
          opacity: 1,
          delay: delayMs + Math.random() * 300,
        });
      }

      // 2. Meriam Kanan Bawah (Menembak meliuk ke kiri atas)
      const rightCount = Math.floor(22 * countMultiplier);
      for (let i = 0; i < rightCount; i++) {
        const pair = RIBBON_COLOR_PAIRS[Math.floor(Math.random() * RIBBON_COLOR_PAIRS.length)];
        const angle = (Math.PI * 0.56) + (Math.random() * 0.16); // ~100° - 130°
        const speed = Math.random() * 14 + 22;

        ribbons.push({
          x: W - Math.random() * (W * 0.12),
          y: H + Math.random() * 20,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          gravity: Math.random() * 0.08 + 0.24,
          drag: 0.982,
          swaySpeed: Math.random() * 0.04 + 0.03,
          swayAmp: Math.random() * 2.2 + 1.2,
          swayPhase: Math.random() * Math.PI * 2,
          width: Math.random() * 5 + 8,
          trail: [],
          maxTrail: Math.floor(Math.random() * 10 + 22),
          color: pair.front,
          darkColor: pair.back,
          twist: Math.random() * Math.PI * 2,
          twistSpeed: (Math.random() - 0.5) * 0.14,
          opacity: 1,
          delay: delayMs + Math.random() * 300,
        });
      }

      // 3. Meriam Tengah Bawah (Menembak menyebar ke atas kubah panggung)
      const centerCount = Math.floor(16 * countMultiplier);
      for (let i = 0; i < centerCount; i++) {
        const pair = RIBBON_COLOR_PAIRS[Math.floor(Math.random() * RIBBON_COLOR_PAIRS.length)];
        const angle = (Math.PI * 0.38) + (Math.random() * 0.24);
        const speed = Math.random() * 16 + 24;

        ribbons.push({
          x: W * 0.5 + (Math.random() - 0.5) * (W * 0.35),
          y: H + Math.random() * 30,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          gravity: Math.random() * 0.08 + 0.22,
          drag: 0.984,
          swaySpeed: Math.random() * 0.05 + 0.03,
          swayAmp: Math.random() * 2.5 + 1.0,
          swayPhase: Math.random() * Math.PI * 2,
          width: Math.random() * 5 + 7,
          trail: [],
          maxTrail: Math.floor(Math.random() * 12 + 20),
          color: pair.front,
          darkColor: pair.back,
          twist: Math.random() * Math.PI * 2,
          twistSpeed: (Math.random() - 0.5) * 0.16,
          opacity: 1,
          delay: delayMs + Math.random() * 250,
        });
      }

      // 4. Taburan Konfeti Potongan Kertas Emas & Warna-Warni Melayang
      const confettiCount = Math.floor(90 * countMultiplier);
      for (let i = 0; i < confettiCount; i++) {
        const speed = Math.random() * 16 + 10;
        const angle = Math.random() * Math.PI * 2;
        confetti.push({
          x: W * 0.5 + (Math.random() - 0.5) * 350,
          y: H * 0.45 + (Math.random() - 0.5) * 150,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 12,
          size: Math.random() * 8 + 6,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          tilt: Math.random() * Math.PI,
          tiltSpeed: Math.random() * 0.12 + 0.06,
          opacity: 1,
          delay: delayMs,
        });
      }
    };

    // Gelombang 1: Tembakan pembuka meledak seketika (0ms)
    spawnRibbonWave(0, 1.0);
    // Gelombang 2: Tembakan susulan saat pemenang sedang dipanggil (+1800ms)
    spawnRibbonWave(1800, 0.7);
    // Gelombang 3: Taburan pita penutup perayaan (+3800ms)
    spawnRibbonWave(3800, 0.5);

    let animationFrameId: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      // 1. Gambar & Update Pita Panjang Berputar (Ribbon Streamers)
      for (const r of ribbons) {
        if (elapsed < r.delay) {
          alive = true;
          continue;
        }

        // Fisika gerakan pita
        r.x += r.vx;
        r.y += r.vy;
        r.vy += r.gravity;
        r.vx *= r.drag;
        r.swayPhase += r.swaySpeed;
        r.x += Math.sin(r.swayPhase) * r.swayAmp;
        r.twist += r.twistSpeed;

        // Rekam riwayat posisi untuk membentuk ekor pita
        r.trail.unshift({ x: r.x, y: r.y });
        if (r.trail.length > r.maxTrail) {
          r.trail.pop();
        }

        // Redupkan bertahap setelah waktu selebrasi
        const ribbonAge = elapsed - r.delay;
        if (ribbonAge > 5500) {
          r.opacity = Math.max(0, r.opacity - 0.012);
        }

        if (r.opacity > 0 && r.trail.length > 2 && r.y < canvas.height + 250) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = r.opacity;

          for (let i = 0; i < r.trail.length - 1; i++) {
            const p1 = r.trail[i];
            const p2 = r.trail[i + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.3) continue;

            const nx = -dy / dist;
            const ny = dx / dist;

            // Simulasi twist 3D (bolak-balik sisi pita depan/belakang)
            const twist = Math.sin(r.twist + i * 0.28);
            const halfW = (r.width / 2) * Math.abs(twist);

            // Sisi depan lebih terang, sisi belakang lebih gelap
            ctx.fillStyle = twist >= 0 ? r.color : r.darkColor;

            ctx.beginPath();
            ctx.moveTo(p1.x + nx * halfW, p1.y + ny * halfW);
            ctx.lineTo(p2.x + nx * halfW, p2.y + ny * halfW);
            ctx.lineTo(p2.x - nx * halfW, p2.y - ny * halfW);
            ctx.lineTo(p1.x - nx * halfW, p1.y - ny * halfW);
            ctx.closePath();
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // 2. Gambar & Update Serpihan Konfeti Persegi 3D
      for (const p of confetti) {
        if (elapsed < p.delay) {
          alive = true;
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // gravitasi
        p.vx *= 0.985;
        p.rotation += p.rotationSpeed;
        p.tilt += p.tiltSpeed;

        const pieceAge = elapsed - p.delay;
        if (pieceAge > 4800) {
          p.opacity = Math.max(0, p.opacity - 0.014);
        }

        if (p.opacity > 0 && p.y < canvas.height + 60) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // 3D tilt flip effect
          ctx.scale(1, Math.cos(p.tilt));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ zIndex }}
      className={`fixed inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
}

