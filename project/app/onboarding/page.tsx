'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

const SUSTAINABILITY_GOALS = [
  'Reduce plastic',
  'Lower energy use',
  'Greener transportation',
  'Eat plant-forward',
  'Donate to eco orgs'
];

const CHARITIES = [
  'Rainforest Alliance',
  'Ocean Cleanup',
  'Sierra Club',
  'World Wildlife Fund'
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<string[]>(['Reduce plastic']);
  const [interests, setInterests] = useState('');
  const [preferredCharities, setPreferredCharities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // save profile details
    await supabase.from('profiles').upsert({
      id: user?.id,
      full_name: name,
      sustainability_goals: goals,
      interests,
      preferred_charities: preferredCharities,
    });

    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur rounded-2xl border border-emerald-100 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Tell us about your eco journey 🌍</h1>
        <p className="text-slate-600 mb-6">
          We'll personalize tasks, AI coaching, and impact numbers based on this.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-800">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-800 mb-2">What do you want to focus on?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUSTAINABILITY_GOALS.map((g) => (
                <label
                  key={g}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:border-emerald-300"
                >
                  <Checkbox checked={goals.includes(g)} onCheckedChange={() => setGoals((s) => toggle(s, g))} />
                  <span className="text-sm text-slate-700">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-800 mb-2">Pick charities to recommend + award points for</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHARITIES.map((c) => (
                <label key={c} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <Checkbox
                    checked={preferredCharities.includes(c)}
                    onCheckedChange={() =>
                      setPreferredCharities((s) => toggle(s, c))
                    }
                  />
                  <span className="text-sm text-slate-700">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">Anything we should know? (e.g. "I bike", "I buy from Costco", "I donate monthly")</label>
            <Textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Finish setup'}
          </Button>
        </form>
      </div>
    </div>
  );
}