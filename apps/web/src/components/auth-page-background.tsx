"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function AuthPageBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMouse({ x, y });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0a0612 0%, #0f0a1a 25%, #0d0818 50%, #0a0614 75%, #080510 100%)",
        }}
      />
      {/* Animated spotlight following cursor */}
      <div
        className="absolute h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 transition-[left,top] duration-700 ease-out"
        style={{
          left: `${mouse.x * 100}%`,
          top: `${mouse.y * 100}%`,
          background:
            "radial-gradient(circle, rgba(147,51,234,0.35) 0%, rgba(192,132,252,0.15) 25%, transparent 55%)",
        }}
      />
      {/* Secondary subtle orb */}
      <div
        className="absolute h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 transition-[left,top] duration-900 ease-out"
        style={{
          left: `${(1 - mouse.x) * 100}%`,
          top: `${(1 - mouse.y) * 80}%`,
          background:
            "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 50%)",
        }}
      />
      {/* Static accent glow (bottom) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(99,102,241,0.12), transparent)",
        }}
      />
    </div>
  );
}
