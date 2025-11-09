'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Star, Leaf, Heart, Check, User } from 'lucide-react';

/* ---------------------------- Types ---------------------------- */
type Prefill = {
  email?: string;
  name?: string;
  bio?: string;
  hobbies?: string[];
  avatarId?: string | null;
};

const PREFILL_KEY = 'EW_PROFILE_PREFILL_V1';

/* ---------------------------- UI bits ---------------------------- */
function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div>
      {label ? <p className="mb-1 text-sm text-slate-700">{label}</p> : null}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            className="rounded-md p-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <Star
              className={`h-6 w-6 ${
                n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-600">{value}/5</span>
      </div>
    </div>
  );
}

function Tag({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition
        ${
          checked
            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      aria-pressed={checked}
    >
      {checked ? <Check className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function OnboardingPage() {
  const router = useRouter();

  // form state
  const [health, setHealth] = React.useState(3);
  const [eco, setEco] = React.useState(3);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState<string | null>(null);

  // central set of interest options (stored as strings in text[])
  const interestOptions = [
    { key: 'fitness', label: 'Fitness & Exercise' },
    { key: 'sleep', label: 'Sleep Quality' },
    { key: 'nutrition', label: 'Nutrition & Diet' },
    { key: 'mindfulness', label: 'Mindfulness & Meditation' },
    { key: 'mental-health', label: 'Mental Health' },
    { key: 'hydration', label: 'Hydration' },
    { key: 'stress', label: 'Stress Management' },
    { key: 'social', label: 'Social Connection' },
    { key: 'recycling', label: 'Recycling' },
    { key: 'water', label: 'Water Conservation' },
    { key: 'energy', label: 'Energy Efficiency' },
    { key: 'transport', label: 'Sustainable Transport' },
    { key: 'plastic', label: 'Plastic Reduction' },
    { key: 'food-waste', label: 'Food Waste' },
    { key: 'local-food', label: 'Local & Organic Food' },
    { key: 'composting', label: 'Composting' },
    { key: 'carbon', label: 'Carbon Footprint' },
    { key: 'green-space', label: 'Nature & Green Space' },
  ];

  const toggleInterest = (k: string) =>
    setInterests((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  /* Prefill from signup + ensure user is authenticated via magic link */
  React.useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg('No authenticated user. Please sign in again.');
        setLoading(false);
        return;
      }

      // best-effort prefill from localStorage
      try {
        const raw = localStorage.getItem(PREFILL_KEY);
        if (raw) {
          const pf = JSON.parse(raw) as Prefill;
          setInterests(Array.isArray(pf.hobbies) ? pf.hobbies : []);
          // do not remove yet; we'll clear after successful upsert
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    // must be authenticated (RLS requires id = auth.uid())
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
      setMsg('You must be signed in to save your profile.');
      setSubmitting(false);
      return;
    }

    // read prefill (avatarId, etc.)
    let prefill: Prefill = {};
    try {
      const raw = localStorage.getItem(PREFILL_KEY);
      if (raw) prefill = JSON.parse(raw);
    } catch {}

    // Build row matching your schema
    const row = {
      id: auth.user.id,                               // REQUIRED for RLS
      full_name: auth.user.email?.split('@')[0] || null,
      email: auth.user.email,
      profile_icon: prefill.avatarId ?? null,
      bio: null,
      hobbies: interests.length ? interests : prefill.hobbies ?? [],
      location: null,
      overall_contentment: health,
      eco_friendly_score: eco,
      total_points: 0,
      current_streak: 0,
      total_tasks: 0,
      personal_tasks: 0,
      todays_points: 0,
    };

    // Upsert into public.profiles
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Upsert error:', error);
      setMsg(error.message || 'Failed to save profile.');
      setSubmitting(false);
      return;
    }

    try {
      localStorage.removeItem(PREFILL_KEY);
    } catch {}

    setMsg('Profile saved! Redirecting…');
    router.replace('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="mt-1 text-slate-600">Quick questions to personalize your experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Health + Eco ratings */}
          <SectionTitle icon={<Heart className="h-5 w-5" />} title="Wellness baseline" subtitle="Rate your current health habits." />
          <StarRating value={health} onChange={setHealth} label="Health rating" />

          <div className="mt-6" />

          <SectionTitle icon={<Leaf className="h-5 w-5" />} title="Eco baseline" subtitle="How eco-friendly is your lifestyle?" />
          <StarRating value={eco} onChange={setEco} label="Eco-friendly rating" />

          <div className="my-6 h-px w-full bg-slate-200" />

          {/* Interests */}
          <SectionTitle icon={<Check className="h-5 w-5" />} title="Areas of Focus" subtitle="Select the areas you want to focus on (choose as many as you like)." />
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((opt) => (
              <Tag key={opt.key} checked={interests.includes(opt.key)} onToggle={() => toggleInterest(opt.key)}>
                {opt.label}
              </Tag>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => (window.history.length > 1 ? window.history.back() : router.push('/'))}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Save & Continue'}
            </Button>
          </div>

          {msg && <p className="mt-3 text-sm text-slate-700">{msg}</p>}
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          We save your profile to your Supabase account so we can tailor tasks to you.
        </p>
      </div>
    </div>
  );
}
