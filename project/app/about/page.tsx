'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Leaf, Heart, Brain, DollarSign, Stethoscope, Users } from 'lucide-react';

export default function AboutPage() {
  const capabilities = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: 'AI Personalization',
      desc:
        'An assistant that learns your preferences and generates tailored tasks and tips.',
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: 'Finance-Aware Insights',
      desc:
        'Spot spending patterns and suggest greener, budget-friendly swaps (e.g., transit over rideshare).',
    },
    {
      icon: <Stethoscope className="w-5 h-5" />,
      title: 'Health Data Ready (Optional)',
      desc:
        'Where available, connect health sources to personalize wellness nudges. Privacy-first by design.',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Human + AI Collaboration',
      desc:
        'You set goals; the assistant adapts, co-plans, and helps track progress over time.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center rounded-full border bg-white/70 px-4 py-2 shadow-sm backdrop-blur border-white/50">
            <Leaf className="w-6 h-6 text-green-600" />
            <span className="ml-2 text-lg font-semibold text-slate-900">
              About EarthWise
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Wellness meets Sustainability—guided by AI
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-slate-700">
            EarthWise blends personal wellness with environmental sustainability through an
            AI-driven companion. It encourages healthy habits (exercise, nutrition, mental health)
            alongside eco-friendly practices (recycling, saving energy) in a fun, gamified way.
          </p>
        </motion.div>

        {/* Why it’s unique */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-12 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur border-white/60"
        >
          <div className="flex items-start gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Heart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Why it’s unique</h2>
              <p className="mt-2 text-slate-700">
                EarthWise turns improving <em>your life and the planet</em> into a collaborative,
                game-like experience with AI. Example prompt: “Walk or bike to work this week instead
                of driving — you’ll burn calories and cut carbon! 📉🌳”. Earn points, streaks, and
                optional charitable rewards while the assistant adapts to your preferences. It brings
                two common needs together—better daily habits and meaningful climate action—on any
                device, without extra friction.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Capabilities & Integrations */}
        <section className="mt-10">
          <h3 className="text-lg font-semibold text-slate-900">Capabilities & Integrations</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {capabilities.map((c) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35 }}
                className="flex items-start gap-3 rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur border-white/60"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-green-700">
                  {c.icon}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{c.title}</h4>
                  <p className="text-sm text-slate-600">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Example & CTA */}
        <section className="mt-12 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur border-white/60">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900">How it feels to use</h3>
              <p className="mt-2 text-slate-700">
                The assistant suggests small, high-leverage actions (e.g., “Swap one drive this week
                for a bike ride”), then rewards momentum with points, streaks, and optional donations—
                keeping progress intrinsically and extrinsically motivating.
              </p>
            </div>
            <div className="shrink-0">
              <Button asChild className="px-6">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
