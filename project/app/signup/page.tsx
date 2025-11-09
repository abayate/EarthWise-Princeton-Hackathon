'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PROFILE_ICONS } from '@/components/profileIcons';
import { Leaf } from 'lucide-react';

const PREFILL_KEY = 'EW_PROFILE_PREFILL_V1';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    bio: '',
    hobbies: [] as string[],
    avatarId: PROFILE_ICONS[0].id,
  });
  const [hobbyInput, setHobbyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) return setMessage('Email is required.');
    // name/bio/hobbies are optional now; you'll finish them on onboarding

    setLoading(true);
    setMessage('');

    try {
      // Check if email already has a profile in the database
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        setMessage('An account with this email already exists. Please log in instead.');
        setLoading(false);
        return;
      }

      // Save prefill so onboarding can read it once the user returns
      try {
        localStorage.setItem(PREFILL_KEY, JSON.stringify(formData));
      } catch {}

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            name: formData.name,
            bio: formData.bio,
            hobbies: formData.hobbies,
            avatarId: formData.avatarId,
          },
        },
      });

      if (error) throw error;

      setMessage('✓ Check your email for the verification link to finish signup.');
      setFormData({
        email: '',
        name: '',
        bio: '',
        hobbies: [],
        avatarId: PROFILE_ICONS[0].id,
      });
      setHobbyInput('');
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="w-full max-w-lg space-y-6 rounded-xl border bg-white/70 p-8 shadow-lg backdrop-blur-sm">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border bg-white/60 px-4 py-2 shadow-sm">
              <Leaf className="h-6 w-6 text-green-600" />
              <span className="ml-2 text-xl font-semibold tracking-tight text-slate-900">
                Welcome to EarthWise
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-2 text-slate-600">We’ll email you a secure sign-in link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (required) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          {/* Avatar Selection (optional) */}
          <div className="space-y-2">
            <Label>Choose Your Avatar (optional)</Label>
            <div className="grid grid-cols-5 gap-4">
              {PROFILE_ICONS.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatarId: icon.id })}
                  className={`relative overflow-hidden rounded-full transition-all hover:ring-2 hover:ring-green-500/70 ${
                    formData.avatarId === icon.id ? 'ring-2 ring-green-600' : ''
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={icon.src} alt={icon.label} />
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                </button>
              ))}
            </div>
          </div>

          {/* Bio (optional) */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us a bit about yourself…"
              className="h-24"
            />
          </div>

          {/* Hobbies (optional) */}
          <div className="space-y-2">
            <Label htmlFor="hobbyInput">Hobbies & Interests (optional)</Label>

            {formData.hobbies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.hobbies.map((hobby, index) => (
                  <span
                    key={`${hobby}-${index}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                  >
                    <span className="mr-1">{hobby}</span>
                    <button
                      type="button"
                      className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-slate-200"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          hobbies: prev.hobbies.filter((_, i) => i !== index),
                        }))
                      }
                      aria-label={`Remove hobby ${hobby}`}
                    >
                      <svg
                        className="h-3.5 w-3.5 opacity-70"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2">
              <Input
                id="hobbyInput"
                type="text"
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const cleaned = hobbyInput.trim().replace(/\s+/g, ' ');
                    if (cleaned && !formData.hobbies.find((h) => h.toLowerCase() === cleaned.toLowerCase())) {
                      setFormData((prev) => ({ ...prev, hobbies: [...prev.hobbies, cleaned] }));
                    }
                    setHobbyInput('');
                  }
                }}
                placeholder="Type a hobby and press Enter…"
              />
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? 'Sending Link…' : 'Send Magic Link'}
          </Button>

          {/* Message */}
          {message && (
            <div
              className={`text-center text-sm font-medium p-3 rounded-lg ${
                message.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-red-600'
              }`}
            >
              {message}
            </div>
          )}

          {/* Login link */}
          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <a href="/login" className="text-emerald-600 hover:text-emerald-700">
              Log in here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
