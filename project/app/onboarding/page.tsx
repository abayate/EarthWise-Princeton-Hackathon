"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

const GOALS = ["Reduce plastic", "Lower energy use", "Eco transportation"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [goals, setGoals] = React.useState<string[]>(["Reduce plastic"]);
  const [insights, setInsights] = React.useState<any[]>([]);
  const [visibleInsights, setVisibleInsights] = React.useState(0);
  const [error, setError] = React.useState("");

  // Reveal insights one by one with animation
  React.useEffect(() => {
    if (step === 3 && insights.length > 0 && visibleInsights < insights.length) {
      const timer = setTimeout(() => {
        setVisibleInsights((v) => v + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, insights, visibleInsights]);

  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate username
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        setError("Not authenticated. Please sign up again.");
        return;
      }

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle();

      let profileError;

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            full_name: name.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.user.id);
        profileError = error;
      } else {
        // Create new profile if it doesn't exist
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: userData.user.id,
            username: username.trim(),
            full_name: name.trim() || null,
            email: userData.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        profileError = error;
      }

      if (profileError) {
        console.error("Profile save error:", profileError);
        console.error("Error details:", JSON.stringify(profileError, null, 2));
        
        if (profileError.code === '23505') {
          setError("Username already taken. Please choose another.");
        } else if (profileError.code === '42703') {
          setError("Database schema issue. Please run the migrations in Supabase.");
        } else if (profileError.message) {
          setError(`Error: ${profileError.message}`);
        } else {
          setError("Failed to save profile. Please try again.");
        }
        return;
      }

      setStep(2);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("An unexpected error occurred.");
    }
  }

  async function handleConnectKnot() {
    setStep(3);
    setVisibleInsights(0);

    try {
      const res = await fetch("/api/knot/sync", {
        method: "POST",
        body: JSON.stringify({ external_user_id: name || "demo-user" }),
      });
      const data = await res.json();
      setInsights(data.insights ?? []);

      if (typeof window !== "undefined") {
        localStorage.setItem("earthwise:lastInsights", JSON.stringify(data.insights ?? []));
      }
    } catch (error) {
      console.error("Knot sync error:", error);
    }

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  }

  async function handleSkip() {
    setStep(3);
    setVisibleInsights(0);
    
    // Redirect immediately after brief loading
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Tell us about you</h1>
            <form className="space-y-6" onSubmit={handleProfileSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Username <span className="text-red-500">*</span></label>
                <Input 
                  className="mt-2" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Name (optional)</label>
                <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">What do you want to focus on?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {GOALS.map((g) => (
                    <label
                      key={g}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:border-emerald-300"
                    >
                      <Checkbox checked={goals.includes(g)} onCheckedChange={() => toggleGoal(g)} />
                      <span className="text-sm text-slate-700">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 space-y-4 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Connect your purchases</h2>
            <p className="text-slate-600 mb-4">
              We use Knot to read SKU-level data (Amazon, Costco, Walmart) so we can give you tasks that match what you
              actually buy.
            </p>
            <div className="inline-flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2">
              <img src="https://knotapi.com/favicon.ico" alt="Knot" className="w-5 h-5" />
              <span className="text-sm font-medium text-emerald-700">Knot Transaction Link</span>
            </div>
            <Button onClick={handleConnectKnot} className="w-full mt-6">
              Link with Knot
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-slate-400 underline mt-2"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="relative">
            <div className="fixed inset-0 bg-white/70 backdrop-blur flex flex-col items-center justify-center gap-6 z-50">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-emerald-700">EarthWise is personalizing your journey…</p>
              <div className="space-y-3 max-h-64 overflow-y-auto w-96">
                {insights.slice(0, visibleInsights).map((i, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white rounded-xl border border-emerald-50 shadow-sm p-3 text-left opacity-0 animate-fade-in"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'forwards' }}
                  >
                    <p className="text-sm font-semibold text-slate-900">{i.title}</p>
                    <p className="text-xs text-slate-500">{i.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
