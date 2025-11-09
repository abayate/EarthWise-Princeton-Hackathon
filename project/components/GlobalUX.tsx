'use client';

import { useEffect, useMemo, useState } from 'react';
import { ensurePrefsAppliedOnLoad, readPrefs, Prefs } from '@/lib/earthwise';

/**
 * A single global overlay:
 * - Applies prefs flags to <html> on mount and whenever prefs change
 * - Listens for 'earthwise:celebrate' to render lightweight confetti
 */
export default function GlobalUX() {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs());
  const [burst, setBurst] = useState<number>(0);

  useEffect(() => {
    ensurePrefsAppliedOnLoad();
  }, []);

  useEffect(() => {
    const onPrefs = (e: Event) => {
      const ce = e as CustomEvent<Prefs>;
      setPrefs(ce.detail);
    };
    window.addEventListener('earthwise:prefs', onPrefs as EventListener);
    return () => window.removeEventListener('earthwise:prefs', onPrefs as EventListener);
  }, []);

  useEffect(() => {
    const onCelebrate = () => {
      if (!prefs.confetti || prefs.reduceMotion) return;
      setBurst((n) => n + 1);
      const id = setTimeout(() => setBurst((n) => n), 1200);
      return () => clearTimeout(id);
    };
    window.addEventListener('earthwise:celebrate', onCelebrate as EventListener);
    return () => window.removeEventListener('earthwise:celebrate', onCelebrate as EventListener);
  }, [prefs.confetti, prefs.reduceMotion]);

  const pieces = useMemo(() => {
    if (!burst) return [];
    return Array.from({ length: 28 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.15;
      const scale = 0.8 + Math.random() * 0.8;
      const rotate = Math.floor(Math.random() * 360);
      const duration = 0.9 + Math.random() * 0.5;
      return { id: `${burst}-${i}`, left, delay, scale, rotate, duration };
    });
  }, [burst]);

  if (!pieces.length) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
        {pieces.map(p => (
          <span
            key={p.id}
            className="block absolute top-[-8px] h-2 w-3 rounded-sm confetti-piece"
            style={{
              left: `${p.left}vw`,
              transform: `scale(${p.scale}) rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              background: confettiColor(p.left),
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        :root[data-reduceMotion="1"] .confetti-piece { animation: none !important; }
        .confetti-piece {
          opacity: 0.95;
          animation-name: ew-fall, ew-spin;
          animation-timing-function: cubic-bezier(.2,.8,.2,1), linear;
          animation-fill-mode: forwards;
        }
        @keyframes ew-fall {
          0% { transform: translate3d(0, -10px, 0) scale(var(--s,1)) rotate(var(--r,0deg)); }
          100% { transform: translate3d(0, 86vh, 0) scale(var(--s,1)) rotate(var(--r,0deg)); opacity: 0.2; }
        }
        @keyframes ew-spin {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(120deg); }
        }
      `}</style>
    </>
  );
}

function confettiColor(x: number) {
  if (x < 20) return 'linear-gradient(180deg,#22c55e,#16a34a)';
  if (x < 40) return 'linear-gradient(180deg,#3b82f6,#2563eb)';
  if (x < 60) return 'linear-gradient(180deg,#06b6d4,#0891b2)';
  if (x < 80) return 'linear-gradient(180deg,#f59e0b,#d97706)';
  return 'linear-gradient(180deg,#ec4899,#db2777)';
}
