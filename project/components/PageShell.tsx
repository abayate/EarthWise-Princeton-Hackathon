"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function PageShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Respect user's reduced-motion preference
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReduced(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else mq.addListener(onChange);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', onChange);
        else mq.removeListener(onChange as any);
      };
    } catch {
      // ignore in SSR or old browsers
    }
  }, []);

  const initial = prefersReduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.995 };
  const animate = { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } } as any;

  return (
    <motion.main initial={initial} animate={animate} className={className}>
      {children}
    </motion.main>
  );
}
