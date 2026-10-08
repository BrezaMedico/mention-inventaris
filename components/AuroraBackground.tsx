'use client';

import React, { useEffect, useRef } from 'react';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;
  wanderAngle: number;
  wanderSpeed: number;
  glowColor: { r: number; g: number; b: number };
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse / Touch tracker
    const pointer = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 140,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initFireflies();
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        pointer.targetX = e.touches[0].clientX;
        pointer.targetY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        pointer.targetX = (e as MouseEvent).clientX;
        pointer.targetY = (e as MouseEvent).clientY;
      }
    };

    const handlePointerLeave = () => {
      pointer.targetX = -2000;
      pointer.targetY = -2000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);

    let time = 0;
    let fireflies: Firefly[] = [];

    // Firefly palette: luminous gold, warm amber, and vivid chartreuse
    const COLOR_PALETTE = [
      { r: 250, g: 204, b: 21 },  // Mention Gold Yellow (#facc15)
      { r: 253, g: 224, b: 71 },  // Bright Radiant Yellow (#fde047)
      { r: 234, g: 179, b: 8 },   // Deep Amber Gold (#eab308)
      { r: 217, g: 249, b: 157 }, // Bioluminescent Lime Gold (#d9f99d)
      { r: 254, g: 240, b: 138 }, // Soft Moonlit Glow (#fef08a)
    ];

    const initFireflies = () => {
      fireflies = [];
      // Proporsi pas: ~36 pada layar HP hingga ~70 pada layar desktop
      const count = Math.min(70, Math.max(36, Math.floor((width * height) / 20000)));

      for (let i = 0; i < count; i++) {
        const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        fireflies.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.8 + 1.2, // 1.2px - 3.0px
          baseAlpha: Math.random() * 0.2 + 0.15,
          pulseSpeed: Math.random() * 0.025 + 0.015,
          phase: Math.random() * Math.PI * 2,
          wanderAngle: Math.random() * Math.PI * 2,
          wanderSpeed: Math.random() * 0.08 + 0.04,
          glowColor: color,
        });
      }
    };

    initFireflies();

    const render = () => {
      time += 0.005;

      pointer.x += (pointer.targetX - pointer.x) * 0.1;
      pointer.y += (pointer.targetY - pointer.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // Deep dark sleek backdrop
      ctx.fillStyle = '#080809';
      ctx.fillRect(0, 0, width, height);

      // --- 1. AMBIENT SOFT AURORA WAVES ---
      // Wave 1
      const w1X = width * 0.3 + Math.sin(time * 0.5) * (width * 0.15);
      const w1Y = height * 0.25 + Math.cos(time * 0.4) * (height * 0.12);
      const grad1 = ctx.createRadialGradient(w1X, w1Y, 0, w1X, w1Y, width * 0.55);
      grad1.addColorStop(0, 'rgba(234, 179, 8, 0.055)');
      grad1.addColorStop(0.5, 'rgba(202, 138, 4, 0.018)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Wave 2
      const w2X = width * 0.75 + Math.cos(time * 0.4) * (width * 0.15);
      const w2Y = height * 0.65 + Math.sin(time * 0.5) * (height * 0.15);
      const grad2 = ctx.createRadialGradient(w2X, w2Y, 0, w2X, w2Y, width * 0.5);
      grad2.addColorStop(0, 'rgba(250, 204, 21, 0.045)');
      grad2.addColorStop(0.5, 'rgba(161, 98, 7, 0.015)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // --- 2. KUNANG-KUNANG (FIREFLIES WITH ORGANIC FLIGHT & GLOW) ---
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Organic wandering flight
        f.wanderAngle += (Math.random() - 0.5) * f.wanderSpeed;
        f.vx += Math.cos(f.wanderAngle) * 0.035;
        f.vy += Math.sin(f.wanderAngle) * 0.035;

        // Kecepatan melayang halus
        const speed = Math.hypot(f.vx, f.vy);
        const maxSpeed = 0.85;
        if (speed > maxSpeed) {
          f.vx = (f.vx / speed) * maxSpeed;
          f.vy = (f.vy / speed) * maxSpeed;
        }

        f.x += f.vx;
        f.y += f.vy;

        // Wrap around boundaries
        if (f.x < -30) f.x = width + 30;
        if (f.x > width + 30) f.x = -30;
        if (f.y < -30) f.y = height + 30;
        if (f.y > height + 30) f.y = -30;

        // Interaksi sentuhan/pointer: kunang-kunang menghindar perlahan jika didekati
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const dist = Math.hypot(dx, dy);

        let hoverBoost = 0;
        if (dist < pointer.radius && pointer.x > -500) {
          const force = (1 - dist / pointer.radius);
          hoverBoost = force * 0.45;
          f.x += (dx / (dist || 1)) * force * 1.5;
          f.y += (dy / (dist || 1)) * force * 1.5;
        }

        // Kedipan kunang-kunang (bioluminescence flicker)
        f.phase += f.pulseSpeed;
        const rawPulse = Math.sin(f.phase);
        const pulse = Math.pow((rawPulse + 1) * 0.5, 2.2);
        const alpha = Math.min(0.9, f.baseAlpha + pulse * 0.55 + hoverBoost);

        const { r, g, b } = f.glowColor;
        const outerHaloRadius = f.size * (4.5 + pulse * 3.5 + hoverBoost * 2.5);

        // Lapisan cahaya luar (Soft Outer Glow)
        const haloGrad = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          outerHaloRadius
        );
        haloGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
        haloGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, outerHaloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inti kunang-kunang (Bright Luminous Core)
        const coreAlpha = Math.min(1, alpha + 0.2);
        ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, Math.max(0.9, f.size * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
}
