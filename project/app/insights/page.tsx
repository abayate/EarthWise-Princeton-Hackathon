'use client';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const mock = [
  { month: 'Now', carbonSaved: 2.1 },
  { month: '+1w', carbonSaved: 2.9 },
  { month: '+2w', carbonSaved: 3.8 },
  { month: '+1m', carbonSaved: 5.2 },
];

export default function InsightsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar title="Predictive Intelligence" subtitle="Forecasted impact from your completed tasks" />
        <main className="flex-1 p-8 space-y-6">
          <div className="rounded-2xl bg-white/80 border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Projected carbon savings</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mock}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis unit=" kg" />
                  <Tooltip />
                  <Line type="monotone" dataKey="carbonSaved" stroke="#059669" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Based on your last 10 tasks, we predict you’ll save ~5.2kg CO₂e next month. Keep completing eco tasks to raise the curve.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
