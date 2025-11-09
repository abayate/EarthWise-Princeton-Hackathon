'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ChatWindow from '@/components/ChatWindow';
import PageShell from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

function NovaActButton() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string[] | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nova/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: ['Reduce plastic', 'Lower energy use'],
          charities: ['Ocean Cleanup', 'World Wildlife Fund']
        })
      });
      const data = await response.json();
      setPlan(data.plan);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={generatePlan}
        disabled={loading}
        className="flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? 'Generating...' : 'Generate plan with Amazon Nova (mock)'}
      </Button>

      {plan && (
        <div className="fixed inset-x-0 bottom-8 mx-auto w-full max-w-2xl px-4">
          <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h3 className="mb-4 text-sm font-medium text-slate-900">
              Nova ACT Generated Plan
            </h3>
            <ol className="space-y-3">
              {plan.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-600">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoachPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar
          title="AI Coach"
          subtitle="Get personalized guidance for your wellness journey"
        />

        <PageShell className="flex-1 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
              <p className="text-sm text-slate-600">Chat with your eco-wellness coach</p>
            </div>
            {/* Removed Amazon Nova button. Only Gemini chat remains. */}
          </div>

          <div className="h-[calc(100vh-240px)]">
            <ChatWindow />
          </div>
        </PageShell>
      </div>
    </div>
  );
}
