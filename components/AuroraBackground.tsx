'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;
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

    // Mouse tracker
    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 160,
      active: false,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      mouse.active = true;
      if ('touches' in e && e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
      }
    };

    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.targetX = -2000;
      mouse.targetY = -2000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);

    let time = 0;
    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      // Subtle & restrained particle count: ~20-25 dots
      const count = Math.min(26, Math.max(16, Math.floor((width * height) / 45000)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 1.0,
          baseAlpha: Math.random() * 0.25 + 0.15,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    initParticles();

    const render = () => {
      time += 0.005;

      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Deep dark clean background
      ctx.fillStyle = '#080809';
      ctx.fillRect(0, 0, width, height);

      // --- 1. SOFT, SUBTLE AURORA GRADIENT ---
      // Wave 1
      const w1X = width * 0.3 + Math.sin(time * 0.5) * (width * 0.15);
      const w1Y = height * 0.25 + Math.cos(time * 0.4) * (height * 0.12);
      const grad1 = ctx.createRadialGradient(w1X, w1Y, 0, w1X, w1Y, width * 0.5);
      grad1.addColorStop(0, 'rgba(234, 179, 8, 0.06)');
      grad1.addColorStop(0.5, 'rgba(202, 138, 4, 0.02)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Wave 2
      const w2X = width * 0.75 + Math.cos(time * 0.4) * (width * 0.15);
      const w2Y = height * 0.65 + Math.sin(time * 0.5) * (height * 0.15);
      const grad2 = ctx.createRadialGradient(w2X, w2Y, 0, w2X, w2Y, width * 0.45);
      grad2.addColorStop(0, 'rgba(250, 204, 21, 0.045)');
      grad2.addColorStop(0.5, 'rgba(161, 98, 7, 0.015)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Interactive gentle mouse aura
      if (mouse.x > -500 && mouse.y > -500) {
        const mouseGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius
        );
        mouseGrad.addColorStop(0, 'rgba(250, 204, 21, 0.07)');
        mouseGrad.addColorStop(0.6, 'rgba(234, 179, 8, 0.02)');
        mouseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mouseGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // --- 2. SUBTLE FLOATING PARTICLES (Titik-Titik Menyala Lembut) ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Soft cursor deflection
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        let hoverBoost = 0;
        if (dist < mouse.radius && mouse.x > -500) {
          const force = 1 - dist / mouse.radius;
          hoverBoost = force * 0.35;
          p.x += (dx / dist) * force * 1.2;
          p.y += (dy / dist) * force * 1.2;
        }

        p.phase += p.pulseSpeed;
        const pulse = (Math.sin(p.phase) + 1) * 0.5;
        const alpha = Math.min(0.7, p.baseAlpha + pulse * 0.2 + hoverBoost);
        const radius = p.size * (1 + pulse * 0.2 + hoverBoost * 0.3);

        // Soft yellow-amber glowing halo
        const haloGrad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          radius * 3.5
        );
        haloGrad.addColorStop(0, `rgba(253, 224, 71, ${alpha})`);
        haloGrad.addColorStop(0.4, `rgba(234, 179, 8, ${alpha * 0.4})`);
        haloGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Small soft center core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.7, radius * 0.5), 0, Math.PI * 2);
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
