'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Leaf,
  Heart,
  TrendingUp,
  Sparkles,
  Recycle,
  Droplets,
  Sun,
  Wind,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
/* ---------------- Typewriter (no cursor) — used ONLY for the title ---------------- */
function useTypewriter(
  text: string,
  opts?: { speed?: number; startDelay?: number }
) {
  const { speed = 24, startDelay = 0 } = opts || {};
  const [display, setDisplay] = React.useState('');

  React.useEffect(() => {
    let i = 0;
    let running = true;
    setDisplay('');

    const startId = setTimeout(() => {
      const intervalId = setInterval(() => {
        if (!running) return clearInterval(intervalId);
        i += 1;
        setDisplay(text.slice(0, i));
        if (i >= text.length) clearInterval(intervalId);
      }, speed);
    }, startDelay);

    return () => {
      running = false;
      clearTimeout(startId);
    };
  }, [text, speed, startDelay]);

  return display;
}

/* ---------------- Rotating badge chip (no typing) ---------------- */
function BadgeRotator({
  items,
  className = '',
  intervalMs = 5200,
  floatY = 10,
  floatDuration = 9,
}: {
  items: { icon: React.ReactNode; label: string }[];
  className?: string;
  intervalMs?: number;
  floatY?: number;
  floatDuration?: number;
}) {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % items.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, items.length]);

  const current = items[i];

  return (
    <motion.div
      className={`fixed z-10 pointer-events-none ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ y: [0, -floatY, 0] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center rounded-full border bg-white/70 px-3 py-1.5 text-slate-700 shadow-sm backdrop-blur-sm border-white/40">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center"
            >
              {current.icon}
              <span className="ml-2 text-xs font-medium">{current.label}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Feature fade-in variants ---------------- */
const featuresContainer = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
      when: 'beforeChildren',
      staggerChildren: 0.14,
    },
  },
};

const featureItem = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' as any },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)' as any,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/* ---------------- Animated underline that "draws" then subtly pulses ---------------- */
function UnderlineWord({
  visibleText,
  target,
  underlineClass = 'bg-emerald-500',
}: {
  visibleText: string;
  target: string;
  underlineClass?: string;
}) {
  const lower = visibleText.toLowerCase();
  const idx = lower.indexOf(target.toLowerCase());
  const hasFullWord = idx !== -1 && visibleText.length >= idx + target.length;

  // Lock underline on once the word has fully appeared.
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (hasFullWord && !armed) setArmed(true);
  }, [hasFullWord, armed]);

  // Until the word exists (and we haven't armed yet) just show raw text.
  if (!hasFullWord && !armed) return <>{visibleText}</>;

  // If somehow armed but the word isn't present (edge case), also show raw text.
  if (idx === -1) return <>{visibleText}</>;

  const before = visibleText.slice(0, idx);
  const word = visibleText.slice(idx, idx + target.length);
  const after = visibleText.slice(idx + target.length);

  return (
    <>
      {before}
      {/* IMPORTANT: keep gradient on the word span so text doesn't disappear */}
      <span className="relative inline-block bg-clip-text text-transparent bg-text-gradient align-baseline">
        {word}
        {/* Draw underline once */}
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className={`absolute left-0 -bottom-1 h-[3px] w-full origin-left rounded-full ${underlineClass}`}
        />
        {/* Soft glow pulse under the line (loop) */}
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute left-0 -bottom-1 h-[3px] w-full rounded-full ${underlineClass}`}
          style={{ filter: 'blur(4px)' }}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.15, 0.6, 0.15], scaleY: [1, 1.5, 1] }}
          transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
        />
      </span>
      {after}
    </>
  );
}

export default function Page() {
  const DELAYS = {
    hero: 0.1,
    features: 0.8,
    button: 1.2,
    footer: 1.6,
  };

  const TAGLINE =
    'Your personal AI coach for sustainable living and holistic wellness. Track habits, earn points, and transform your lifestyle one task at a time.';

  /* ---- Typewriter timings (ONLY title) ---- */
  const TITLE_SPEED = 45; // ms per character
  const TITLE_START = 400; // ms delay before typing starts

  const titleLine1Text = 'Live Better,';
  const titleLine2Text = 'Live Greener';

  const titleLine1 = useTypewriter(titleLine1Text, {
    speed: TITLE_SPEED,
    startDelay: TITLE_START,
  });

  const titleLine2Start =
    TITLE_START + titleLine1Text.length * TITLE_SPEED + 350; // pause before line 2
  const titleLine2 = useTypewriter(titleLine2Text, {
    speed: TITLE_SPEED,
    startDelay: titleLine2Start,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* --- Background layers --- */}
      <div className="absolute inset-0 -z-10 grid-bg" />
      <div className="absolute inset-0 -z-10 gradient-wash" />
      <div className="pointer-events-none absolute -z-10 blur-3xl">
        <div className="blob blob-green" />
        <div className="blob blob-emerald" />
        <div className="blob blob-sky" />
      </div>

      {/* Floating rotating badges */}
      <BadgeRotator
        className="top-28 left-6 md:top-24 md:left-16"
        items={[
          { icon: <Leaf className="w-4 h-4 text-emerald-600" />, label: 'Low Waste' },
          { icon: <Recycle className="w-4 h-4 text-emerald-600" />, label: 'Plastic-Free' },
          { icon: <Droplets className="w-4 h-4 text-emerald-600" />, label: 'Save Water' },
        ]}
        intervalMs={5200}
        floatY={10}
        floatDuration={10}
      />

      <BadgeRotator
        className="bottom-24 right-6 md:bottom-20 md:right-16"
        items={[
          { icon: <Sparkles className="w-4 h-4 text-emerald-600" />, label: 'Mindful Minutes' },
          { icon: <Sun className="w-4 h-4 text-amber-500" />, label: 'Solar Power' },
          { icon: <Wind className="w-4 h-4 text-sky-500" />, label: 'Bike to Work' },
        ]}
        intervalMs={5600}
        floatY={12}
        floatDuration={11}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20">
        {/* Brand */}
        <motion.div
          className="mb-10 flex justify-center"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center rounded-full border bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md border-white/40">
            <Leaf className="w-7 h-7 text-green-600" />
            <span className="ml-2 text-xl font-semibold tracking-tight text-slate-900">
              EarthWise
            </span>
          </div>
        </motion.div>

        {/* Hero */}
        <div className="text-center">
          <motion.h1
            className="mx-auto max-w-3xl bg-clip-text text-transparent bg-text-gradient text-5xl font-bold leading-tight sm:text-6xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: DELAYS.hero }}
          >
            {/* Line 1: underline “Better” */}
            <span>
              <UnderlineWord
                visibleText={titleLine1}
                target="Better"
                underlineClass="bg-emerald-500"
              />
            </span>
            <br />
            {/* Line 2: underline “Greener” */}
            <span>
              <UnderlineWord
                visibleText={titleLine2}
                target="Greener"
                underlineClass="bg-emerald-500"
              />
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="mx-auto mt-5 max-w-2xl text-balance text-lg text-slate-700"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: DELAYS.hero + 0.1 }}
          >
            {TAGLINE}
          </motion.p>
        </div>

        {/* Features — fade-in (staggered) */}
        <motion.div
          className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={featuresContainer}
          initial="hidden"
          animate="show"
          transition={{ delay: DELAYS.features }}
        >
          {[
            {
              icon: <Heart className="w-6 h-6" />,
              title: 'Health Goals',
              desc: 'Track wellness habits and build sustainable routines for better health.',
            },
            {
              icon: <Leaf className="w-6 h-6" />,
              title: 'Eco Actions',
              desc: 'Make a positive impact with daily eco-friendly challenges and tips.',
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: 'Progress Tracking',
              desc: 'Visualize your journey with streaks, points, and achievements.',
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={featureItem}
              className="relative overflow-hidden rounded-2xl border bg-white/70 p-8 shadow-lg backdrop-blur-sm border-white/40"
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="inline-flex items-center justify-center rounded-xl bg-emerald-100/70 p-3">
                <div className="text-green-600">{f.icon}</div>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-slate-600">{f.desc}</p>
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </motion.div>
          ))}
        </motion.div>

        {/* Get Started button */}
        <motion.div
          className="mt-8 flex justify-center"
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: DELAYS.button, duration: 0.5, ease: 'easeOut' }}
        >
          <Button asChild size="lg" className="btn-primary text-lg px-8 py-6 h-auto" aria-label="Get Started">
            <Link href="/signup">Get Started</Link>
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="pt-10 text-center text-sm text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: DELAYS.footer }}
        >
          Built with mindfulness for the planet—and you.
        </motion.p>
      </div>
    </div>
  );
}
