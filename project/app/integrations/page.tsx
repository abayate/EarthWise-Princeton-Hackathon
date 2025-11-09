'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { KnotLogo } from '@/components/KnotLogo';
import {
  Leaf,
  PenTool,
  Layout,
  Database,
  Bot,
  Images,
  DollarSign,
  GitBranch,
  Users,
  Rocket,
  CheckCircle2,
  XCircle,
  HelpCircle,
  KeyRound,
  PlugZap,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Helper: Status badge */
function StatusBadge({
  state,
  title,
}: {
  state: 'connected' | 'configured' | 'optional' | 'missing' | 'server';
  title?: string;
}) {
  const styles: Record<typeof state, string> = {
    connected:
      'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    configured:
      'bg-sky-100 text-sky-700 ring-1 ring-sky-300',
    optional:
      'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
    missing:
      'bg-rose-100 text-rose-700 ring-1 ring-rose-300',
    server:
      'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  };
  const Icon =
    state === 'connected'
      ? CheckCircle2
      : state === 'missing'
      ? XCircle
      : state === 'server'
      ? KeyRound
      : HelpCircle;

  const label =
    title ??
    (state === 'connected'
      ? 'Connected'
      : state === 'configured'
      ? 'Configured'
      : state === 'server'
      ? 'Server key required'
      : state === 'optional'
      ? 'Optional'
      : 'Missing');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${styles[state]}`}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

interface KnotTransaction {
  merchant: string;
  sku: string;
  amount: number;
  category: string;
}

export default function IntegrationsPage() {
  // --- Knot integration state ---
  const [knotTransactions, setKnotTransactions] = useState<KnotTransaction[]>([]);
  const [knotLoading, setKnotLoading] = useState(true);

  // Fetch Knot transactions on mount
  useEffect(() => {
    fetch('/api/knot/mock')
      .then(res => res.json())
      .then(data => {
        setKnotTransactions(data.transactions);
        setKnotLoading(false);
      })
      .catch(err => {
        console.error('Error fetching Knot data:', err);
        setKnotLoading(false);
      });
  }, []);

  // --- Detect client-visible env (safe) ---
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // We intentionally do not read secret server envs (e.g., OPENAI_API_KEY) on the client.

  // --- Optional client-side stored API keys (demo UX) ---
  const [nessieKey, setNessieKey] = useState('');
  const [carbonApiKey, setCarbonApiKey] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setNessieKey(localStorage.getItem('integr_capitalone_nessie_key') || '');
    setCarbonApiKey(localStorage.getItem('integr_carbon_footprint_key') || '');
  }, []);

  const handleSave = () => {
    setSaved('saving');
    localStorage.setItem('integr_capitalone_nessie_key', nessieKey.trim());
    localStorage.setItem('integr_carbon_footprint_key', carbonApiKey.trim());
    setTimeout(() => setSaved('saved'), 350);
    setTimeout(() => setSaved('idle'), 1600);
  };

  const nessieStatus: 'optional' | 'configured' =
    nessieKey.trim() ? 'configured' : 'optional';
  const carbonStatus: 'optional' | 'configured' =
    carbonApiKey.trim() ? 'configured' : 'optional';

  // --- Small animation helpers ---
  const section = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.4, delay: 0.03 * i },
  });

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <motion.div
          {...section(0)}
          className="flex items-start justify-between gap-6"
        >
          <div>
            <div className="inline-flex items-center rounded-full border bg-white/70 px-4 py-2 shadow-sm backdrop-blur border-white/50">
              <PlugZap className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-semibold text-slate-900">
                Integrations
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Connect your tools to power EarthWise
            </h1>
            <p className="mt-2 max-w-2xl text-slate-700">
              This app blends wellness + sustainability with an AI coach. Below are the
              integrations we use or support, with quick status and setup notes.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <StatusBadge state={supabaseConfigured ? 'connected' : 'missing'} title="Supabase" />
            <StatusBadge state="server" title="OpenAI (server env)" />
            <StatusBadge state="optional" title="Nessie / Carbon APIs" />
          </div>
        </motion.div>

        {/* 1) Planning & Design */}
        <motion.section {...section(1)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-emerald-600" />
            Planning & Design
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Users className="h-5 w-5" />}
              title="ChatGPT (Ideation & Prompts)"
              rationale="Use AI to brainstorm features, outline app structure, and generate prompts/UI copy fast."
              status={<StatusBadge state="optional" />}
              actions={
                <Button asChild variant="outline" size="sm">
                  <Link href="/about">See app concept</Link>
                </Button>
              }
              tools={['ChatGPT']}
            />
            <Card
              icon={<Layout className="h-5 w-5" />}
              title="Figma / Canva (Wireframes)"
              rationale="Quickly prototype flows (login, dashboard, tasks) and align the team visually."
              status={<StatusBadge state="optional" />}
              tools={['Figma', 'Canva']}
            />
          </div>
        </motion.section>

        {/* 2) Frontend (Web) */}
        <motion.section {...section(2)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Layout className="h-5 w-5 text-emerald-600" />
            Frontend (Web)
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Leaf className="h-5 w-5" />}
              title="No-/Low-code UI"
              rationale="Bubble, FlutterFlow, or Retool can drag-and-drop responsive pages (login, dashboard, chat) fast."
              status={<StatusBadge state="optional" />}
              tools={['Bubble', 'FlutterFlow', 'Retool']}
            />
            <Card
              icon={<GitBranch className="h-5 w-5" />}
              title="Current App (Next.js + shadcn/ui)"
              rationale="You’re running a custom Next.js app with protected routes, streaks, tasks, and Supabase auth."
              status={<StatusBadge state="connected" title="In use" />}
              tools={['Next.js', 'Tailwind', 'shadcn/ui', 'lucide-react', 'framer-motion']}
              actions={
                <Button asChild size="sm">
                  <Link href="/app/dashboard">Open Dashboard</Link>
                </Button>
              }
            />
          </div>
        </motion.section>

        {/* 3) Backend & Database */}
        <motion.section {...section(3)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            Backend & Database
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Database className="h-5 w-5" />}
              title="Supabase (Auth & DB)"
              rationale="Instant auth + Postgres + storage. Used for login and user profiles."
              status={
                <StatusBadge
                  state={supabaseConfigured ? 'connected' : 'missing'}
                  title={supabaseConfigured ? 'Configured' : 'Add NEXT_PUBLIC_SUPABASE_*'}
                />
              }
              tools={['Supabase']}
              extra={
                !supabaseConfigured ? (
                  <EnvSnippet
                    lines={[
                      'NEXT_PUBLIC_SUPABASE_URL=...',
                      'NEXT_PUBLIC_SUPABASE_ANON_KEY=...',
                    ]}
                  />
                ) : null
              }
            />
            <Card
              icon={<Database className="h-5 w-5" />}
              title="Bubble DB / Firebase (Alternative)"
              rationale="If using Bubble, rely on its DB + workflows; Firebase is another quick auth/store option."
              status={<StatusBadge state="optional" />}
              tools={['Bubble DB', 'Firebase']}
            />
            <Card
              icon={<GitBranch className="h-5 w-5" />}
              title="Node.js API (Optional)"
              rationale="Add custom endpoints (e.g., proxy AI calls). Can be scaffolded quickly with codegen tools."
              status={<StatusBadge state="optional" />}
              tools={['Node.js', 'Express']}
            />
          </div>
        </motion.section>

        {/* 4) AI / ML Integration */}
        <motion.section {...section(4)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-600" />
            AI / ML Integration
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Bot className="h-5 w-5" />}
              title="OpenAI / AWS AI (Coach Brain)"
              rationale="Use GPT via server route for chat/task suggestions. AWS Lex/Bedrock fits the AWS track."
              status={<StatusBadge state="server" title="Set OPENAI_API_KEY (server)" />}
              tools={['OpenAI API', 'AWS Lex', 'AWS Bedrock']}
              extra={
                <p className="text-xs text-slate-500">
                  Store secrets in <code>.env</code> (server): <code>OPENAI_API_KEY</code>.
                  Call via server actions or API routes—don’t expose keys client-side.
                </p>
              }
            />
            <Card
              icon={<Images className="h-5 w-5" />}
              title="Hugging Face (Optional CV/Models)"
              rationale="Pre-trained models for recycling/food recognition if you add photo tips."
              status={<StatusBadge state="optional" />}
              tools={['Hugging Face Inference API']}
            />
          </div>
        </motion.section>

        {/* 5) Financial Integration (optional) */}
        <motion.section {...section(5)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Financial Integration (Optional)
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<DollarSign className="h-5 w-5" />}
              title="Capital One Nessie (Simulated)"
              rationale="Fetch mock transactions, then coach suggests greener swaps (e.g., reduce gas spend)."
              status={<StatusBadge state={nessieStatus === 'configured' ? 'configured' : 'optional'} />}
              tools={['Nessie API']}
              extra={
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-xs text-slate-600">Nessie API Key (stored locally)</Label>
                  <Input
                    value={nessieKey}
                    onChange={(e) => setNessieKey(e.target.value)}
                    placeholder="nessie_xxx..."
                  />
                </div>
              }
            />
            <Card
              icon={<Leaf className="h-5 w-5" />}
              title="Carbon Footprint API (Optional)"
              rationale="Estimate emissions from purchases or travel and surface eco insights."
              status={<StatusBadge state={carbonStatus === 'configured' ? 'configured' : 'optional'} />}
              tools={['Any open carbon API']}
              extra={
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-xs text-slate-600">Carbon API Key (stored locally)</Label>
                  <Input
                    value={carbonApiKey}
                    onChange={(e) => setCarbonApiKey(e.target.value)}
                    placeholder="carbon_api_xxx..."
                  />
                </div>
              }
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={handleSave}>
              {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved!' : 'Save Keys'}
            </Button>
            <p className="text-xs text-slate-500">
              Demo-only: keys stored in <code>localStorage</code> so teammates can test UI quickly.
              For production, keep secrets on the server.
            </p>
          </div>
        </motion.section>

        {/* 6) Collaboration & Code */}
        <motion.section {...section(6)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-600" />
            Collaboration & Code
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Users className="h-5 w-5" />}
              title="VS Code Live Share + GitHub"
              rationale="Live edit together; use branches/PRs to parallelize and avoid conflicts."
              status={<StatusBadge state="optional" />}
              tools={['VS Code Live Share', 'GitHub', 'GitHub Projects / Trello']}
            />
            <Card
              icon={<Users className="h-5 w-5" />}
              title="Team Workflow"
              rationale="Split features (tasks, coach, streaks, integrations). Commit often; tag releases for demo."
              status={<StatusBadge state="optional" />}
              tools={['Branches', 'PR Reviews', 'Issue Labels']}
            />
          </div>
        </motion.section>

        {/* 7) Deployment */}
        <motion.section {...section(7)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-emerald-600" />
            Deployment
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<Rocket className="h-5 w-5" />}
              title="Vercel / Netlify"
              rationale="Auto-deploy from GitHub for a stable judging URL."
              status={<StatusBadge state="optional" />}
              tools={['Vercel', 'Netlify']}
              actions={
                <Button asChild variant="outline" size="sm">
                  <Link href="https://vercel.com" target="_blank">Open Vercel</Link>
                </Button>
              }
            />
            <Card
              icon={<Leaf className="h-5 w-5" />}
              title="Bubble (Alternate)"
              rationale="One-click deploy if you go the Bubble route; pair with MLH .tech domain."
              status={<StatusBadge state="optional" />}
              tools={['Bubble', '.tech domain']}
            />
          </div>
        </motion.section>

        {/* 8) Knot Integration */}
        <motion.section {...section(8)} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            SKU-Level Data
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={<KnotLogo className="text-emerald-600" />}
              title="Knot API Integration"
              rationale="SKU-level data → turned into tasks"
              status={<StatusBadge state="connected" title="Mock Data Active" />}
              tools={['Transaction Data', 'SKU Analysis']}
              extra={
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-slate-700">Recent Sustainable Purchases:</p>
                  {knotLoading ? (
                    <p className="text-sm text-slate-600">Loading transactions...</p>
                  ) : (
                    <div className="space-y-2">
                      {knotTransactions.map((tx, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-slate-800">{tx.merchant}</div>
                          <div className="text-xs text-slate-600">SKU: {tx.sku}</div>
                          <div className="text-xs text-emerald-600">${tx.amount.toFixed(2)} - {tx.category}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </motion.section>

        {/* Footer tip */}
        <p className="mt-10 text-xs text-slate-500">
          Tip: Keep sensitive API keys on the server (e.g.,{' '}
          <code>OPENAI_API_KEY</code>), and expose only safe, client-needed values via{' '}
          <code>NEXT_PUBLIC_*</code>.
        </p>
      </div>
    </div>
  );
}

/** Card component for concise integration blocks */
function Card({
  icon,
  title,
  rationale,
  tools,
  status,
  actions,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  rationale: string;
  tools: string[];
  status?: React.ReactNode;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur border-white/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-green-700">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              {status}
            </div>
            <p className="mt-1 text-sm text-slate-600">{rationale}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tools.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {t}
                </span>
              ))}
            </div>
            {extra && <div className="mt-3">{extra}</div>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

/** Display env snippet lines */
function EnvSnippet({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900/95 p-3 text-xs text-slate-100 ring-1 ring-slate-800">
      {lines.join('\n')}
    </pre>
  );
}
