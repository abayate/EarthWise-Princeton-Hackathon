'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import DashboardCard from '@/components/DashboardCard';
import {
  Heart,
  Leaf,
  TrendingUp,
  Flame,
  Award,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
  RotateCcw,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS, celebrateIfEnabled, playClickIfEnabled, pointsToImpact, forecastImpact } from '@/lib/earthwise';
import { supabase } from '@/lib/supabase';

/* ---------------- Profile key ---------------- */
const PROFILE_KEY = 'EW_PROFILE_V1';

/* -------- Leaderboard + aggregates keys (UPDATED) -------- */
const LB_POINTS_KEY = 'EW_TODAYS_POINTS_V1';          // carries MONTHLY points for leaderboard
const AWARDED_TODAY_KEY = 'EW_TODAYS_AWARDED_V1';     // monotonic awarded points for current day
const AWARDED_IDS_KEY = 'EW_TODAYS_AWARDED_IDS_V1';   // task ids already awarded today
const LB_DATA_KEY   = 'EW_LEADERBOARD_DATA_V1';
const MONTHLY_POINTS_KEY = 'EW_MONTHLY_POINTS_V1';    // number (monthly sum)
const TOTAL_POINTS_KEY   = 'EW_TOTAL_POINTS_V1';      // number (lifetime sum)
const LIFETIME_BASELINE_KEY = 'EW_LIFETIME_BASELINE_V1'; // number (pre-existing lifetime points)

/* ---------------- Types ---------------- */
type Profile = {
  id: string;
  createdAt: string;
  name?: string;
  about?: string;
  healthRating: number; // 1-5
  ecoRating: number;    // 1-5
  interests: string[];
};

type TaskDetails = {
  about: string;
  health: string;
  environment: string;
  tips?: string[];
};

type Task = {
  id: string;
  label: string;
  points: number;
  completed: boolean;
  details?: TaskDetails;
};

type DailyLog = Record<string, boolean>;
type ViewMode = 'focus' | 'browse';

/* -------- New: snapshot (entry) types & constants -------- */
type SnapshotTask = Pick<Task, 'id' | 'label' | 'points' | 'completed'>;

type DayEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  ts: number;   // epoch ms
  totals: {
    points: number;              // awarded points captured at snapshot time
    completedCount: number;
    healthCompleted: number;
    ecoCompleted: number;
  };
  health: SnapshotTask[];
  eco: SnapshotTask[];
  action?: { section: 'health' | 'eco' | 'rollover'; taskId?: string; completed?: boolean };
};

const ENTRIES_KEY = 'EW_ENTRIES_V1';
const ENTRIES_LIMIT = 180;

/* ---------------- Scoring / UI constants ---------------- */
/** TODAY starts from 0 now. We award only task points. */
const BASE_POINTS = 0;
const BASE_TOTAL_TASKS = 12;
const DAILY_COMPLETION_THRESHOLD = 1;
const RECENT_LIMIT = 5;

/* ---- Details libraries ---- */
const HEALTH_DETAILS: Record<string, TaskDetails> = {
  'yoga-20': {
    about: 'A 20-minute bodyweight yoga flow done at home.',
    health:
      'Improves flexibility and mobility, reduces stress via parasympathetic activation, and supports core strength and balance.',
    environment:
      'Home bodyweight practice has near-zero energy use and avoids travel emissions to a gym.',
    tips: ['Use a mat or towel; focus on breath cadence (4–6s inhales/exhales).'],
  },
  'strength-15': {
    about: 'Quick 15-minute compound strength set (push/pull/legs).',
    health:
      'Builds lean mass, supports bone density, improves insulin sensitivity, and raises resting metabolic rate.',
    environment:
      'Minimal or no equipment; no electricity; tiny footprint compared with cardio machines.',
    tips: ['Pick 3 moves: squats, pushups, rows. 45s work / 15s rest × 3 rounds.'],
  },
  'intervals-10': {
    about: '10 minutes of intervals (e.g., brisk walk/jog sprints).',
    health:
      'Time-efficient VO₂ and cardiovascular gains, better blood pressure and mitochondrial function.',
    environment:
      'No powered equipment; can be done outdoors, encouraging active transport habits.',
    tips: ['Try 30s hard / 30s easy × 10; warm up 1–2 minutes first.'],
  },
  'healthy-breakfast': {
    about: 'Protein + fruit (e.g., eggs/Greek yogurt + berries).',
    health:
      'Steadier glucose, reduced cravings, better concentration; protein supports recovery.',
    environment:
      'Choosing seasonal, plant-forward sides can lower meal emissions compared with ultra-processed options.',
    tips: ['Add whole-grain carbs and fiber; prep the night before.'],
  },
  'steps-8000': {
    about: 'Accumulate at least 8,000 steps across the day.',
    health:
      'Associated with lower all-cause mortality and better cardiometabolic health; breaks up sedentary time.',
    environment:
      'Short errand walks can replace some car trips, indirectly reducing local emissions.',
    tips: ['Park farther, take stairs, do 5-minute movement breaks each hour.'],
  },
  'sleep-8h': {
    about: 'Target ~8 hours of consistent, high-quality sleep.',
    health:
      'Improves memory consolidation, mood, hormonal balance, and immune function; enhances training recovery.',
    environment:
      'No direct environmental impact; well-rested people often make better day-to-day energy choices.',
    tips: ['Regular bed/wake times; dim screens 60 minutes before bed.'],
  },
  'screen-breaks': {
    about: 'Take 1–2 minute breaks from screens each hour.',
    health:
      'Reduces eye strain and musculoskeletal tension; helps posture and focus.',
    environment:
      'Tiny decrease in device energy use; also encourages ambient-light usage awareness.',
    tips: ['Follow 20-20-20: every 20 min, look 20 ft away for 20 seconds.'],
  },
  'journaling-5': {
    about: 'Reflective journaling for 5 minutes.',
    health:
      'Supports stress regulation and goal clarity; evidence for improved resilience and mood.',
    environment:
      'No direct effect; paper choice and digital note habits can reduce waste.',
    tips: ['Use 3 prompts: What went well? What was hard? What’s next?'],
  },
  'breathing-3': {
    about: '3 minutes of slow diaphragmatic breathing.',
    health:
      'Down-regulates stress response, lowers heart rate, improves perceived calm.',
    environment:
      'No impact; can reduce unnecessary “stress scrolling” time on devices.',
    tips: ['Try 4-4-6: inhale 4, hold 4, exhale 6 (nose if comfortable).'],
  },
  'posture-x3': {
    about: 'Three posture checks spread through the day.',
    health:
      'Reduces neck/shoulder strain and headaches; improves breathing efficiency.',
    environment: 'No impact.',
    tips: ['Stack ears over shoulders; set phone reminders for check-ins.'],
  },
};

const ECO_DETAILS: Record<string, TaskDetails> = {
  'meatless-meal': {
    about: 'Choose a plant-forward meal for one sitting.',
    health:
      'Higher fiber, micronutrients, and unsaturated fats; supports heart and gut health.',
    environment:
      'Plant-based meals typically have substantially lower greenhouse gas emissions than meat-heavy meals.',
    tips: ['Build a bowl: grain + beans + veggies + sauce; keep frozen veggies handy.'],
  },
  'cold-wash-laundry': {
    about: 'Run laundry on cold.',
    health:
      'Gentler on fabrics and dyes (less skin irritation from dye bleed).',
    environment:
      'Saves the energy used to heat water; cold cycles can cut washer energy dramatically.',
    tips: ['Use liquid detergent designed for cold; full loads only.'],
  },
  'short-shower-5': {
    about: 'Cap showers at ~5 minutes.',
    health: 'Less skin dryness; preserves natural oils.',
    environment: 'Saves water and the energy required to heat it.',
    tips: ['Play a 5-minute song; install a low-flow showerhead.'],
  },
  'unplug-standby': {
    about: 'Unplug or switch off idle electronics.',
    health: 'Less cable clutter and heat; marginally improves indoor comfort.',
    environment:
      'Cuts standby (“vampire”) power draw to reduce electricity use.',
    tips: ['Use a power strip with a single off switch.'],
  },
  'thermostat-1deg': {
    about: 'Adjust thermostat ±1°F (±0.5°C).',
    health: 'Still comfortable; supports thermal habituation.',
    environment: 'Every degree can save heating/cooling energy over time.',
    tips: ['Pair with sealing drafts and wearing layers.'],
  },
  'reusable-mug-bottle': {
    about: 'Bring a reusable mug/bottle instead of disposables.',
    health:
      'Promotes regular hydration; avoids potential microplastics from some disposables.',
    environment:
      'Reduces single-use waste and production energy.',
    tips: ['Keep a spare cup/bottle in bag or car.'],
  },
  'recycle-sort': {
    about: 'Sort recyclables properly (follow local rules).',
    health:
      'Cleaner waste streams can reduce local air and soil contamination over time.',
    environment:
      'Improves material recovery; lowers raw-material extraction and landfill burden.',
    tips: ['Rinse containers lightly; don’t bag recyclables unless your MRF requires it.'],
  },
  'compost-scraps': {
    about: 'Collect food scraps for composting.',
    health:
      'Can support home gardening (nutrient-dense soil for fresh produce).',
    environment:
      'Diverts organics from landfill, reducing methane emissions.',
    tips: ['Use a countertop bin; freeze scraps to prevent odors.'],
  },
  'public-transit-carpool': {
    about: 'Use transit or carpool for a trip.',
    health: 'Often leads to more walking, which boosts daily activity.',
    environment:
      'Fewer single-occupancy vehicle miles → lower per-person emissions.',
    tips: ['Batch errands; coordinate rides with coworkers or classmates.'],
  },
  'no-single-use-plastic': {
    about: 'Avoid single-use plastics for the day.',
    health:
      'Reduces potential microplastics exposure from certain packaging.',
    environment:
      'Cuts plastic waste and upstream production emissions.',
    tips: ['Carry utensil kit and tote; choose products with minimal packaging.'],
  },
};

/* ---- helpers ---- */
function attachDetails(tasks: Task[], map: Record<string, TaskDetails>): Task[] {
  return tasks.map((t) => (map[t.id] ? { ...t, details: map[t.id] } : t));
}

function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

function computeStreak(log: DailyLog): number {
  const today = new Date();
  let streak = 0;
  const todayKey = dateKey(today);
  let cursor = new Date(today);
  if (log[todayKey]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  } else {
    cursor = addDays(cursor, -1);
  }
  while (log[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function pruneLog(log: DailyLog, keepDays = 60): DailyLog {
  const today = new Date();
  const kept: DailyLog = {};
  for (let i = 0; i < keepDays; i++) {
    const k = dateKey(addDays(today, -i));
    if (k in log) kept[k] = log[k];
  }
  return kept;
}

function findNextIncompleteIndex(tasks: Task[], startIdx: number, direction: 1 | -1 = 1): number {
  if (!tasks.length) return 0;
  for (let step = 0; step <= tasks.length; step++) {
    const i = (startIdx + step * direction + tasks.length) % tasks.length;
    if (!tasks[i].completed) return i;
  }
  return startIdx;
}
function nextSequentialIndex(length: number, currentIdx: number, direction: 1 | -1) {
  if (length === 0) return 0;
  return (currentIdx + direction + length) % length;
}
function indexById(tasks: Task[], id: string) {
  return Math.max(0, tasks.findIndex((t) => t.id === id));
}
function pushRecent(ids: string[], id: string, limit = RECENT_LIMIT) {
  const next = [id, ...ids.filter((x) => x !== id)];
  return next.slice(0, limit);
}

/* ---- accent utils for highlights ---- */
function accent(section: 'health' | 'eco') {
  return section === 'health'
    ? {
        dotActive: 'bg-pink-600',
        dotDone: 'bg-pink-300 hover:bg-pink-400',
        progress: 'bg-pink-500',
        ring: 'ring-2 ring-pink-300/70',
        chipBg: 'bg-pink-50',
        chipText: 'text-pink-700',
        headerBar: 'from-pink-500/90 to-rose-400/90',
        badgeBg: 'bg-pink-100',
        badgeText: 'text-pink-700',
        buttonActive: 'bg-pink-600 hover:bg-pink-600 text-white',
      }
    : {
        dotActive: 'bg-green-600',
        dotDone: 'bg-green-300 hover:bg-green-400',
        progress: 'bg-green-600',
        ring: 'ring-2 ring-green-300/70',
        chipBg: 'bg-green-50',
        chipText: 'text-green-700',
        headerBar: 'from-green-600/90 to-emerald-500/90',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700',
        buttonActive: 'bg-green-600 hover:bg-green-600 text-white',
      };
}

/* -------- New: snapshot helpers -------- */
const uuid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID()
    : `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

function buildEntry(
  health: Task[],
  eco: Task[],
  awardedPoints: number,
  dateOverride?: string,
  action?: DayEntry['action']
): DayEntry {
  const completedCount = [...health, ...eco].filter((t) => t.completed).length;

  return {
    id: uuid(),
    date: dateOverride ?? dateKey(),
    ts: Date.now(),
    totals: {
      points: Math.max(0, awardedPoints),
      completedCount,
      healthCompleted: health.filter((t) => t.completed).length,
      ecoCompleted: eco.filter((t) => t.completed).length,
    },
    health: health.map(({ id, label, points, completed }) => ({ id, label, points, completed })),
    eco: eco.map(({ id, label, points, completed }) => ({ id, label, points, completed })),
    action,
  };
}

function saveEntryToStorage(entry: DayEntry) {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    const list: DayEntry[] = raw ? (JSON.parse(raw) as DayEntry[]) : [];
    list.unshift(entry);
    if (list.length > ENTRIES_LIMIT) list.length = ENTRIES_LIMIT;
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
  } catch {
    // ignore storage failures
  }
}

/* ---------- All available default tasks (for seeding) ---------- */
const ALL_HEALTH: Task[] = [
  { id: 'yoga-20', label: '20-minute yoga', points: 20, completed: false },
  { id: 'strength-15', label: '15-minute strength training', points: 25, completed: false },
  { id: 'intervals-10', label: '10-minute intervals', points: 20, completed: false },
  { id: 'healthy-breakfast', label: 'Healthy breakfast (protein + fruit)', points: 15, completed: false },
  { id: 'steps-8000', label: '8,000 steps', points: 25, completed: false },
  { id: 'sleep-8h', label: 'Sleep 8 hours', points: 30, completed: false },
  { id: 'screen-breaks', label: 'Screen breaks every hour', points: 10, completed: false },
  { id: 'journaling-5', label: '5-minute journaling', points: 10, completed: false },
  { id: 'breathing-3', label: '3-minute breathing exercise', points: 10, completed: false },
  { id: 'posture-x3', label: 'Posture check ×3', points: 5, completed: false },
];

const ALL_ECO: Task[] = [
  { id: 'meatless-meal', label: 'Meatless meal', points: 25, completed: false },
  { id: 'cold-wash-laundry', label: 'Cold-wash laundry', points: 15, completed: false },
  { id: 'short-shower-5', label: '5-minute shower', points: 15, completed: false },
  { id: 'unplug-standby', label: 'Unplug idle devices', points: 10, completed: false },
  { id: 'thermostat-1deg', label: 'Thermostat ±1°F adjustment', points: 15, completed: false },
  { id: 'reusable-mug-bottle', label: 'Bring a reusable mug/bottle', points: 10, completed: false },
  { id: 'recycle-sort', label: 'Sort & recycle properly', points: 10, completed: false },
  { id: 'compost-scraps', label: 'Collect food scraps for composting', points: 20, completed: false },
  { id: 'public-transit-carpool', label: 'Use public transit or carpool', points: 30, completed: false },
  { id: 'no-single-use-plastic', label: 'No single-use plastic today', points: 25, completed: false },
];

/* ---------- Personalization: interest → task ids ---------- */
const INTEREST_MAP_HEALTH: Record<string, string[]> = {
  fitness: ['yoga-20', 'strength-15', 'intervals-10', 'steps-8000'],
  sleep: ['sleep-8h'],
  nutrition: ['healthy-breakfast'],
  mindfulness: ['journaling-5', 'breathing-3'],
  transport: ['steps-8000'],
};

const INTEREST_MAP_ECO: Record<string, string[]> = {
  recycling: ['recycle-sort'],
  water: ['short-shower-5'],
  energy: ['unplug-standby', 'thermostat-1deg'],
  transport: ['public-transit-carpool'],
  plastic: ['no-single-use-plastic', 'reusable-mug-bottle'],
};

/* ---------- Personalization helpers ---------- */
function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function chooseCountFromRating(rating: number, min = 5, mid = 8, max = 10) {
  if (rating <= 1) return Math.max(4, min);
  if (rating === 2) return Math.max(6, min + 1);
  if (rating === 3) return mid;
  if (rating === 4) return Math.min(9, max - 1);
  return max; // 5
}

function rankAndSelect(
  universe: Task[],
  interestMap: Record<string, string[]>,
  selectedInterests: string[],
  rating: number
): Task[] {
  const wantedIds = unique(
    selectedInterests.flatMap((k) => interestMap[k] || [])
  );
  const scored = universe.map((t, idx) => ({
    t,
    score: wantedIds.includes(t.id) ? 1000 - idx : 500 - idx,
  }));
  scored.sort((a, b) => b.score - a.score);

  const count = chooseCountFromRating(rating);
  const picked = scored.slice(0, Math.min(count, universe.length)).map((x) => x.t);

  return unique(picked);
}

/* ---------- NEW: points milestone helper ---------- */
type MilestoneState = {
  next: number;
  remaining: number;
  percentToNext: number; // 0..1
  hitExact: boolean;
  message: string;
  pillClass: string;
};

function computeMilestone(points: number): MilestoneState {
  const onHundred = points % 100 === 0 && points !== 0;
  const next = onHundred ? points + 100 : (Math.floor(points / 100) + 1) * 100;
  const remaining = next - points;
  const within = onHundred ? 0 : points % 100;
  const pct = onHundred ? 0 : within / 100;

  let message = '';
  let pillClass = 'bg-slate-100 text-slate-700';

  if (points === 0) {
    message = `Knock out a task to start earning points.`;
  } else if (onHundred) {
    message = `Milestone unlocked: ${points}. Next target ${next} (+100 pts).`;
    pillClass = 'bg-green-50 text-green-700';
  } else if (pct < 0.25) {
    message = `Next milestone at ${next} — ${remaining} pts to go.`;
    pillClass = 'bg-slate-100 text-slate-700';
  } else if (pct < 0.5) {
    message = `Quarter way to ${next} — ${remaining} pts to go.`;
    pillClass = 'bg-blue-50 text-blue-700';
  } else if (pct < 0.75) {
    message = `Halfway to ${next}! ${remaining} pts to go.`;
    pillClass = 'bg-indigo-50 text-indigo-700';
  } else if (pct < 0.9) {
    message = `Close to ${next} — ${remaining} pts left.`;
    pillClass = 'bg-amber-50 text-amber-700';
  } else {
    message = `Just ${remaining} pts for ${next} — one task might do it.`;
    pillClass = 'bg-green-50 text-green-700';
  }

  return { next, remaining, percentToNext: pct, hitExact: onHundred, message, pillClass };
}

/* ---------- SMALL TOP-LEVEL UI PIECES ---------- */
function PointsPill({ points }: { points?: number }) {
  if (typeof points !== 'number') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Sparkles className="h-3.5 w-3.5" />
      +{points} pts
    </span>
  );
}

function CurrentTaskCard({
  section,
  task,
  index,
  total,
  onToggle,
  focusActive,
}: {
  section: 'health' | 'eco';
  task?: Task;
  index: number;
  total: number;
  onToggle: () => void;
  focusActive: boolean;
}) {
  const a = accent(section);
  return (
    <div
      className={`relative flex items-center justify-between p-4 rounded-2xl border bg-white
      ${focusActive ? `${a.ring} border-transparent shadow-md` : 'border-slate-100'}`}
    >
      {focusActive && (
        <div className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br from-white/0 to-black/5 blur-2xl" />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {task?.label ?? '—'}
          </p>
          <PointsPill points={task?.points} />
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Task {index + 1} of {total}
        </p>
      </div>
      <Button
        size="sm"
        variant={task?.completed ? 'default' : 'outline'}
        onClick={onToggle}
        aria-label={task?.completed ? 'Undo task' : 'Complete task'}
      >
        {task?.completed ? 'Undo' : 'Complete'}
      </Button>
    </div>
  );
}

/* ---------- Leaderboard seed ---------- */
type LBUser = { id: number; name: string; score: number; avatar?: string };
const LB_SEED: LBUser[] = [
  { id: 1, name: 'Alex Chen', score: 2150 },
  { id: 2, name: 'Sarah Miller', score: 1950 },
  { id: 3, name: 'James Wilson', score: 1840 },
  { id: 4, name: 'Emma Davis', score: 1720 },
  { id: 5, name: 'Michael Brown', score: 1680 },
  { id: 6, name: 'Lisa Taylor', score: 1590 },
  { id: 7, name: 'David Park', score: 1520 },
  { id: 8, name: 'Rachel Green', score: 1480 },
  { id: 9, name: 'Thomas Lee', score: 1440 },
  { id: 10, name: 'Jessica Kim', score: 1390 },
];

/* --- compute rank & “gap to next” --- */
function computeRankAndGap(myScore: number, board: LBUser[]) {
  const combined = [...board, { id: 0, name: 'You', score: myScore }];
  combined.sort((a, b) => b.score - a.score);
  const meIdx = combined.findIndex((u) => u.id === 0);
  const myRank = meIdx + 1;
  if (meIdx <= 0) return { myRank, gap: 0, nextName: null as string | null };
  const ahead = combined[meIdx - 1];
  const gap = Math.max(0, ahead.score - myScore + 1);
  return { myRank, gap, nextName: ahead.name };
}

/* ======= NEW: Lifetime baseline (simulated prior usage) ======= */
function ensureLifetimeBaseline(): number {
  try {
    const raw = localStorage.getItem(LIFETIME_BASELINE_KEY);
    const parsed = raw ? parseInt(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;

    // Seed once with a believable prior total (e.g., 3k–9k)
    const baseline = 3000 + Math.floor(Math.random() * 6000);
    localStorage.setItem(LIFETIME_BASELINE_KEY, String(baseline));
    return baseline;
  } catch {
    return 3000; // safe fallback
  }
}

/* ======= NEW: Aggregation helpers (Monthly & Total) ======= */
/** Collapses entries to the latest snapshot per date (YYYY-MM-DD) */
function latestPointsByDate(entries: DayEntry[]) {
  const map = new Map<string, { points: number; ts: number }>();
  for (const e of entries) {
    const prev = map.get(e.date);
    if (!prev || e.ts > prev.ts) {
      map.set(e.date, { points: e.totals.points, ts: e.ts });
    }
  }
  return map;
}

/** Compute monthly & lifetime totals; override today with live awarded points and add baseline to lifetime */
function computeAggregates(todaysAwarded: number) {
  let entries: DayEntry[] = [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    entries = raw ? (JSON.parse(raw) as DayEntry[]) : [];
  } catch {}

  const latest = latestPointsByDate(entries);

  // Override today's date with current live awarded total to avoid mid-day stale sums
  const todayK = dateKey();
  latest.set(todayK, { points: Math.max(0, todaysAwarded), ts: Date.now() });

  const now = new Date();
  const ymPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const baseline = ensureLifetimeBaseline();

  let monthlyPoints = 0;
  let totalPoints = baseline; // start with simulated prior lifetime

  for (const [d, v] of latest) {
    totalPoints += v.points;
    if (d.startsWith(ymPrefix)) monthlyPoints += v.points;
  }

  return { monthlyPoints, totalPoints };
}

/* ===========================
   Dashboard Page
   =========================== */
export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Reflect DB-backed today's points for UI
  const [todaysDbPoints, setTodaysDbPoints] = useState<number | null>(null);
  // Reflect DB-backed lifetime total tasks
  const [totalDbTasks, setTotalDbTasks] = useState<number | null>(null);
  // Total points from task_completions table
  const [totalPointsFromDb, setTotalPointsFromDb] = useState<number | null>(null);
  // Track if we're currently saving points
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // Monotonic awarded points and awarded ids for today
  const [awardedToday, setAwardedToday] = useState<number>(0);
  const [awardedIds, setAwardedIds] = useState<string[]>([]);

  // Leaderboard static data (others). Live board published by /leaderboard page.
  const [leaderboardData, setLeaderboardData] = useState<LBUser[]>(LB_SEED);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LB_DATA_KEY);
      if (raw) setLeaderboardData(JSON.parse(raw) as LBUser[]);
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === LB_DATA_KEY && e.newValue) {
        try { setLeaderboardData(JSON.parse(e.newValue) as LBUser[]); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Defaults used if no saved tasks and no profile
  const defaultHealth = attachDetails(ALL_HEALTH, HEALTH_DETAILS);
  const defaultEco = attachDetails(ALL_ECO, ECO_DETAILS);

  const [healthTasks, setHealthTasks] = useState<Task[]>(defaultHealth);
  const [ecoTasks, setEcoTasks] = useState<Task[]>(defaultEco);
  const [dailyLog, setDailyLog] = useState<DailyLog>({});

  const [healthIndex, setHealthIndex] = useState<number>(0);
  const [ecoIndex, setEcoIndex] = useState<number>(0);

  const healthIndexRef = useRef(0);
  const ecoIndexRef = useRef(0);
  useEffect(() => { healthIndexRef.current = healthIndex; }, [healthIndex]);
  useEffect(() => { ecoIndexRef.current = ecoIndex; }, [ecoIndex]);

  // Keep task arrays in refs so snapshot uses fresh other-section state
  const healthTasksRef = useRef<Task[]>(defaultHealth);
  const ecoTasksRef = useRef<Task[]>(defaultEco);
  useEffect(() => { healthTasksRef.current = healthTasks; }, [healthTasks]);
  useEffect(() => { ecoTasksRef.current = ecoTasks; }, [ecoTasks]);

  const [healthMode, setHealthMode] = useState<ViewMode>('browse');
  const [ecoMode, setEcoMode] = useState<ViewMode>('browse');

  const [recentHealth, setRecentHealth] = useState<string[]>([]);
  const [recentEco, setRecentEco] = useState<string[]>([]);

  // Refs to avoid stale closures when awarding inside state updaters
  const awardedTodayRef = useRef(0);
  const awardedIdsRef = useRef<string[]>([]);
  useEffect(() => { awardedTodayRef.current = awardedToday; }, [awardedToday]);
  useEffect(() => { awardedIdsRef.current = awardedIds; }, [awardedIds]);

  /* ====== NEW: pulse ring control for Health card ====== */
  const [healthPulse, setHealthPulse] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);
  const [healthPulseKey, setHealthPulseKey] = useState(0);
  function triggerHealthPulse() {
    // restart animation by remounting the span
    setHealthPulseKey((k) => k + 1);
    setHealthPulse(true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => setHealthPulse(false), 950);
  }

  /* ====== NEW: pulse ring control for Eco card ====== */
  const [ecoPulse, setEcoPulse] = useState(false);
  const ecoPulseTimerRef = useRef<number | null>(null);
  const [ecoPulseKey, setEcoPulseKey] = useState(0);
  function triggerEcoPulse() {
    setEcoPulseKey((k) => k + 1);
    setEcoPulse(true);
    if (ecoPulseTimerRef.current) window.clearTimeout(ecoPulseTimerRef.current);
    ecoPulseTimerRef.current = window.setTimeout(() => setEcoPulse(false), 950);
  }

  /* ---- load profile + persisted state; seed from profile on first run ---- */
  useEffect(() => {
    async function loadProfile() {
      try {
        // Ensure we have a lifetime baseline stored (simulated prior usage)
        ensureLifetimeBaseline();

        // Load profile from Supabase (logged-in user)
        const { data: userData } = await supabase.auth.getUser();
        let p: Profile | null = null;

        if (userData?.user) {
          setUserId(userData.user.id);
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id)
            .maybeSingle();

          if (dbProfile) {
            // Map DB profile to local Profile type
            p = {
              id: dbProfile.id,
              createdAt: dbProfile.created_at,
              name: dbProfile.full_name || undefined,
              about: dbProfile.bio || undefined,
              healthRating: dbProfile.overall_contentment || 3,
              ecoRating: dbProfile.eco_friendly_score || 3,
              interests: Array.isArray(dbProfile.hobbies) ? dbProfile.hobbies : [],
            };

            // Today's points from DB (reset to 0 if last_activity_date isn't today)
            const todayStr = dateKey();
            const fromDb = Number(dbProfile.todays_points ?? 0);
            const last = dbProfile.last_activity_date as string | null;
            setTodaysDbPoints(last === todayStr ? Math.max(0, fromDb) : 0);
            setTotalDbTasks(Number(dbProfile.total_tasks ?? 0));
          }

          // Fetch total points from task_completions table
          const { data: completions } = await supabase
            .from('task_completions')
            .select('points')
            .eq('user_id', userData.user.id);

          if (completions && completions.length > 0) {
            const total = completions.reduce((sum, item) => sum + (item.points || 0), 0);
            setTotalPointsFromDb(total);
          } else {
            setTotalPointsFromDb(0);
          }
        }

        // Fallback to localStorage profile if DB profile not found
        if (!p) {
          const pRaw = localStorage.getItem(PROFILE_KEY);
          p = pRaw ? JSON.parse(pRaw) : null;
        }

        setProfile(p);

        // Existing persisted task state
        const hRaw = localStorage.getItem(STORAGE_KEYS.HEALTH);
        const eRaw = localStorage.getItem(STORAGE_KEYS.ECO);
        const logRaw = localStorage.getItem(STORAGE_KEYS.LOG);
        const lastOpenRaw = localStorage.getItem(STORAGE_KEYS.LAST_OPEN);
        const rhRaw = localStorage.getItem(STORAGE_KEYS.RECENT_HEALTH);
        const reRaw = localStorage.getItem(STORAGE_KEYS.RECENT_ECO);
        const hmRaw = localStorage.getItem(STORAGE_KEYS.MODE_HEALTH);
        const emRaw = localStorage.getItem(STORAGE_KEYS.MODE_ECO);

        // Read awarded points + ids for today (used for rollover and restoring same-day state)
        const awardedRaw = localStorage.getItem(AWARDED_TODAY_KEY);
        const awardedIdsRaw = localStorage.getItem(AWARDED_IDS_KEY);
        let awardedVal = awardedRaw ? parseInt(awardedRaw, 10) || 0 : 0;
        let awardedIdsVal: string[] = [];
        try { awardedIdsVal = awardedIdsRaw ? (JSON.parse(awardedIdsRaw) as string[]) : []; } catch { awardedIdsVal = []; }

        let h = hRaw ? attachDetails(JSON.parse(hRaw) as Task[], HEALTH_DETAILS) : null;
        let e = eRaw ? attachDetails(JSON.parse(eRaw) as Task[], ECO_DETAILS) : null;

        const log = logRaw ? (JSON.parse(logRaw) as DailyLog) : {};
        const rh = rhRaw ? (JSON.parse(rhRaw) as string[]) : [];
        const re = reRaw ? (JSON.parse(reRaw) as string[]) : [];

        let hm: ViewMode = hmRaw === 'focus' ? 'focus' : 'browse';
        let em: ViewMode = emRaw === 'focus' ? 'focus' : 'browse';

        const todayK = dateKey();

        // If first run (no stored tasks) but we have profile → seed personalized lists
        if ((!h || !h.length || !e || !e.length) && p) {
          const seededHealth = rankAndSelect(ALL_HEALTH, INTEREST_MAP_HEALTH, p.interests || [], p.healthRating || 3);
          const seededEco = rankAndSelect(ALL_ECO, INTEREST_MAP_ECO, p.interests || [], p.ecoRating || 3);
          h = attachDetails(seededHealth, HEALTH_DETAILS);
          e = attachDetails(seededEco, ECO_DETAILS);

          // Bias to focus mode if baseline is low (1–2)
          if ((p.healthRating || 3) <= 2) hm = 'focus';
          if ((p.ecoRating || 3) <= 2) em = 'focus';

          localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(h));
          localStorage.setItem(STORAGE_KEYS.ECO, JSON.stringify(e));
          localStorage.setItem(STORAGE_KEYS.MODE_HEALTH, hm);
          localStorage.setItem(STORAGE_KEYS.MODE_ECO, em);

          try {
            window.dispatchEvent(
              new CustomEvent('notify', {
                detail: {
                  title: 'Personalized plan ready',
                  description: 'Tasks prioritized from your onboarding survey.',
                  level: 'success',
                  href: '/tasks',
                },
              })
            );
          } catch {}
        }

        // If we still don’t have seeded lists, fall back to defaults
        const healthFinal = h ?? defaultHealth;
        const ecoFinal = e ?? defaultEco;

        if (lastOpenRaw && lastOpenRaw !== todayK) {
          // Create rollover snapshot for the previous day using awarded points
          const rolloverEntry = buildEntry(healthFinal, ecoFinal, awardedVal, lastOpenRaw, { section: 'rollover' });
          saveEntryToStorage(rolloverEntry);

          const reset = (tasks: Task[]) => tasks.map((t) => ({ ...t, completed: false }));
          setHealthTasks(reset(healthFinal));
          setEcoTasks(reset(ecoFinal));
          setHealthIndex(0);
          setEcoIndex(0);
          setRecentHealth([]);
          setRecentEco([]);
          setAwardedToday(0);
          setAwardedIds([]);
          localStorage.setItem(AWARDED_TODAY_KEY, '0');
          localStorage.setItem(AWARDED_IDS_KEY, '[]');
          awardedTodayRef.current = 0;
          awardedIdsRef.current = [];
          setTodaysDbPoints(0);
        } else {
          setHealthTasks(healthFinal);
          setEcoTasks(ecoFinal);
          setRecentHealth(rh);
          setRecentEco(re);
          setAwardedToday(Math.max(0, awardedVal));
          setAwardedIds(Array.isArray(awardedIdsVal) ? awardedIdsVal : []);
          awardedTodayRef.current = Math.max(0, awardedVal);
          awardedIdsRef.current = Array.isArray(awardedIdsVal) ? awardedIdsVal : [];
        }

        setHealthMode(hm);
        setEcoMode(em);

        setDailyLog(pruneLog(log));
        localStorage.setItem(STORAGE_KEYS.LAST_OPEN, todayK);
      } catch (err) {
        console.error('Profile load error:', err);
        setProfile(null);
        setHealthTasks(defaultHealth);
        setEcoTasks(defaultEco);
        setDailyLog({});
        setHealthIndex(0);
        setEcoIndex(0);
        setRecentHealth([]);
        setRecentEco([]);
        setHealthMode('browse');
        setEcoMode('browse');
        localStorage.setItem(STORAGE_KEYS.LAST_OPEN, dateKey());
      }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Align once so we start on an incomplete item if needed
  const didInitAlignRef = useRef(false);
  useEffect(() => {
    if (didInitAlignRef.current) return;
    if (healthTasks.length) alignToNextIncompleteIfNeeded('health');
    if (ecoTasks.length) alignToNextIncompleteIfNeeded('eco');
    didInitAlignRef.current = true;
  }, [healthTasks, ecoTasks]);

  /* ---- clamp indices ---- */
  useEffect(() => {
    setHealthIndex((i) =>
      healthTasks.length ? ((i % healthTasks.length) + healthTasks.length) % healthTasks.length : 0
    );
  }, [healthTasks.length]);
  useEffect(() => {
    setEcoIndex((i) =>
      ecoTasks.length ? ((i % ecoTasks.length) + ecoTasks.length) % ecoTasks.length : 0
    );
  }, [ecoTasks.length]);

  /* ---- derived ---- */
  const completedCountToday = useMemo(
    () => [...healthTasks, ...ecoTasks].filter((t) => t.completed).length,
    [healthTasks, ecoTasks]
  );
  const todaysCompleted = useMemo(
    () => completedCountToday >= DAILY_COMPLETION_THRESHOLD,
    [completedCountToday]
  );

  // Today’s Points come from monotonic awarded tally (undo will not subtract)
  // Prefer DB-backed value when loaded; fallback to local awarded tally until then
  const todaysPoints = typeof todaysDbPoints === 'number' ? todaysDbPoints : awardedToday;

  // Get last 7 days' points for forecasting
  const past7DaysPoints = useMemo(() => {
    if (typeof window === 'undefined') return [80, 90, 110, 130, 125, 100, 120]; // fallback for SSR
    
    // Get entries from local storage
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [80, 90, 110, 130, 125, 100, 120]; // fallback if no data
    
    try {
      const entries: DayEntry[] = JSON.parse(raw);
      // Get last 7 days' points
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      return entries
        .filter(entry => new Date(entry.date) >= sevenDaysAgo)
        .map(entry => entry.totals.points)
        .slice(-7); // take last 7 only
    } catch (e) {
      return [80, 90, 110, 130, 125, 100, 120]; // fallback on error
    }
  }, []);

  /* ===== NEW: compute & publish Monthly/Total + Leaderboard sync ===== */
  const [monthlyPoints, setMonthlyPoints] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    const { monthlyPoints: m, totalPoints: t } = computeAggregates(awardedToday);
    setMonthlyPoints(m);
    setTotalPoints(t);

    try {
      // Persist + notify same-tab listeners (Sidebar)
      localStorage.setItem(MONTHLY_POINTS_KEY, String(m));
      window.dispatchEvent(new StorageEvent('storage', { key: MONTHLY_POINTS_KEY, newValue: String(m) }));

      localStorage.setItem(TOTAL_POINTS_KEY, String(t));
      window.dispatchEvent(new StorageEvent('storage', { key: TOTAL_POINTS_KEY, newValue: String(t) }));

      // Publish monthly score to leaderboard
      localStorage.setItem(LB_POINTS_KEY, String(m));
      window.dispatchEvent(new CustomEvent('leaderboardUpdate', { detail: { points: m } }));
    } catch {}
  }, [todaysPoints]);

  // Progressive milestone (based on Today’s Points starting at 0)
  const milestone = useMemo(() => computeMilestone(todaysPoints), [todaysPoints]);

  // Leaderboard “gap to next” based on **Monthly Points**
  const { myRank, gap, nextName } = useMemo(
    () => computeRankAndGap(monthlyPoints, leaderboardData),
    [monthlyPoints, leaderboardData]
  );

  // Total tasks: use DB lifetime total_tasks if loaded, otherwise fall back to simulated baseline + local completions
  const totalTasksDisplay = useMemo(() => {
    if (typeof totalDbTasks === 'number') return totalDbTasks;
    return BASE_TOTAL_TASKS + completedCountToday; // fallback
  }, [totalDbTasks, completedCountToday]);

  const currentStreak = useMemo(() => computeStreak(dailyLog), [dailyLog]);

  const healthCompleted = healthTasks.filter((t) => t.completed).length;
  const ecoCompleted = ecoTasks.filter((t) => t.completed).length;
  const healthAllDone = healthTasks.length > 0 && healthCompleted === healthTasks.length;
  const ecoAllDone = ecoTasks.length > 0 && ecoCompleted === ecoTasks.length;

  /* ---- cross-tab + same-window sync ---- */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.HEALTH && e.newValue) {
        setHealthTasks(attachDetails(JSON.parse(e.newValue), HEALTH_DETAILS));
      } else if (e.key === STORAGE_KEYS.ECO && e.newValue) {
        setEcoTasks(attachDetails(JSON.parse(e.newValue), ECO_DETAILS));
      } else if (e.key === STORAGE_KEYS.LOG && e.newValue) {
        setDailyLog(pruneLog(JSON.parse(e.newValue)));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCustom = (e: Event) => {
      const ce = (e as CustomEvent<{ key?: string; value?: string }>);
      const { key, value } = ce.detail || {};
      if (!key || !value) return;
      if (key === STORAGE_KEYS.HEALTH) {
        setHealthTasks(attachDetails(JSON.parse(value), HEALTH_DETAILS));
      } else if (key === STORAGE_KEYS.ECO) {
        setEcoTasks(attachDetails(JSON.parse(value), ECO_DETAILS));
      }
    };
    window.addEventListener('taskStateUpdate', handleCustom as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('taskStateUpdate', handleCustom as EventListener);
    };
  }, []);

  /* ---- persist simple states ---- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(healthTasks));
  }, [healthTasks]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ECO, JSON.stringify(ecoTasks));
  }, [ecoTasks]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECENT_HEALTH, JSON.stringify(recentHealth));
  }, [recentHealth]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECENT_ECO, JSON.stringify(recentEco));
  }, [recentEco]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE_HEALTH, healthMode);
  }, [healthMode]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE_ECO, ecoMode);
  }, [ecoMode]);

  /* ---- daily log ---- */
  useEffect(() => {
    const todayK = dateKey();
    setDailyLog((prev) => {
      const next = { ...prev, [todayK]: todaysCompleted };
      const pruned = pruneLog(next);
      localStorage.setItem(STORAGE_KEYS.LOG, JSON.stringify(pruned));
      return pruned;
    });
  }, [todaysCompleted]);

  /* ---- mode alignment ---- */
  function alignToNextIncompleteIfNeeded(section: 'health' | 'eco') {
    if (section === 'health') {
      setHealthIndex((i) => {
        const list = healthTasks;
        if (!list.length) return 0;
        if (list[i]?.completed) return findNextIncompleteIndex(list, i, 1);
        return i;
      });
    } else {
      setEcoIndex((i) => {
        const list = ecoTasks;
        if (!list.length) return 0;
        if (list[i]?.completed) return findNextIncompleteIndex(list, i, 1);
        return i;
      });
    }
  }
  function setModeAndAlign(section: 'health' | 'eco', newMode: ViewMode) {
    if (section === 'health') {
      setHealthMode(newMode);
      if (newMode === 'focus') alignToNextIncompleteIfNeeded('health');
    } else {
      setEcoMode(newMode);
      if (newMode === 'focus') alignToNextIncompleteIfNeeded('eco');
    }
  }

  /* ---- resets ---- */
  function handleReset(section: 'health' | 'eco') {
    if (section === 'health') {
      setHealthTasks((prev) => {
        if (!prev.length) return prev;
        const reset = prev.map((t) => ({ ...t, completed: false }));
        localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(reset));
        window.dispatchEvent(
          new CustomEvent('taskStateUpdate', {
            detail: { key: STORAGE_KEYS.HEALTH, value: JSON.stringify(reset) },
          })
        );
        return reset;
      });
      setRecentHealth([]);
      setHealthIndex(0);
    } else {
      setEcoTasks((prev) => {
        if (!prev.length) return prev;
        const reset = prev.map((t) => ({ ...t, completed: false }));
        localStorage.setItem(STORAGE_KEYS.ECO, JSON.stringify(reset));
        window.dispatchEvent(
          new CustomEvent('taskStateUpdate', {
            detail: { key: STORAGE_KEYS.ECO, value: JSON.stringify(reset) },
          })
        );
        return reset;
      });
      setRecentEco([]);
      setEcoIndex(0);
    }
  }

  /* ---- navigation + toggle ---- */
  // Helper: Refetch today's points from database to update UI
  async function refetchTodaysPoints() {
    try {
      if (!userId) return;
      const { data: row } = await supabase
        .from('profiles')
        .select('todays_points, month_points, total_points, total_tasks')
        .eq('id', userId)
        .maybeSingle();
      
      if (row) {
        const todayStr = dateKey();
        const last = (row as any).last_activity_date as string | null;
        const sameDay = last === todayStr;
        
        setTodaysDbPoints(sameDay ? Math.max(0, Number(row.todays_points ?? 0)) : 0);
        setTotalPointsFromDb(Math.max(0, Number(row.total_points ?? 0)));
        setTotalDbTasks(Math.max(0, Number(row.total_tasks ?? 0)));
        console.log('✓ Refetched points from database:', {
          todays: row.todays_points,
          total: row.total_points,
          tasks: row.total_tasks
        });
      }
    } catch (e) {
      console.warn('Failed to refetch points:', e);
    }
  }

  // Helper: Refetch total points from task_completions
  async function refetchTotalPoints() {
    try {
      if (!userId) return;
      const { data: completions } = await supabase
        .from('task_completions')
        .select('points')
        .eq('user_id', userId);

      if (completions && completions.length > 0) {
        const total = completions.reduce((sum, item) => sum + (item.points || 0), 0);
        setTotalPointsFromDb(total);
      } else {
        setTotalPointsFromDb(0);
      }
    } catch (e) {
      console.warn('refetchTotalPoints failed', e);
    }
  }

  // Helper: Apply a points delta (can be negative for undo) and optional task count delta (+1 on first complete, -1 on undo)
  async function applyPointsDelta(delta: number, taskDelta: number = 0) {
    setIsSavingPoints(true);
    try {
      if (!userId) {
        console.warn('Cannot apply points delta: user not logged in');
        setIsSavingPoints(false);
        return;
      }
      if (delta === 0 && taskDelta === 0) {
        setIsSavingPoints(false);
        return;
      }
      
      const { data: row, error } = await supabase
        .from('profiles')
        .select('todays_points, month_points, total_points, last_activity_date, total_tasks')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile for points update:', error);
        return;
      }
      
      // If no profile exists, create one
      if (!row) {
        console.log('No profile found, creating initial profile...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            todays_points: Math.max(0, delta),
            month_points: Math.max(0, delta),
            total_points: Math.max(0, delta),
            total_tasks: Math.max(0, taskDelta),
            last_activity_date: dateKey(),
          });
        
        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('✓ Profile created and points awarded');
        }
        return;
      }
      const todayStr = dateKey();
      const last = (row?.last_activity_date as string | null) || null;
      const sameDay = last === todayStr;
      const sameMonth = (() => {
        if (!last) return true;
        const [ly, lm] = last.split('-');
        const [ty, tm] = todayStr.split('-');
        return ly === ty && lm === tm;
      })();
      const currentToday = Math.max(0, Number(row?.todays_points ?? 0));
      const currentMonth = Math.max(0, Number(row?.month_points ?? 0));
      const currentTotal = Math.max(0, Number(row?.total_points ?? 0));
      const currentTasks = Math.max(0, Number(row?.total_tasks ?? 0));

      const nextToday = Math.max(0, (sameDay ? currentToday : 0) + delta);
      const nextMonth = Math.max(0, (sameMonth ? currentMonth : 0) + delta);
      const nextTotal = Math.max(0, currentTotal + delta);
      const nextTasks = Math.max(0, currentTasks + taskDelta);

      console.log('Updating points:', { 
        userId, 
        delta, 
        taskDelta,
        currentToday, 
        nextToday, 
        currentMonth, 
        nextMonth,
        currentTotal,
        nextTotal 
      });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          todays_points: nextToday,
          month_points: nextMonth,
          total_points: nextTotal,
          total_tasks: nextTasks,
          last_activity_date: todayStr,
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating profile points:', updateError);
      } else {
        console.log('✓ Points updated successfully');
      }
    } catch (e) {
      console.error('applyPointsDelta failed:', e);
    } finally {
      setIsSavingPoints(false);
    }
  }

  function next(section: 'health' | 'eco') {
    if (section === 'health') setHealthIndex((i) => nextSequentialIndex(healthTasks.length, i, 1));
    else setEcoIndex((i) => nextSequentialIndex(ecoTasks.length, i, 1));
  }
  function prev(section: 'health' | 'eco') {
    if (section === 'health') setHealthIndex((i) => nextSequentialIndex(healthTasks.length, i, -1));
    else setEcoIndex((i) => nextSequentialIndex(ecoTasks.length, i, -1));
  }
  function goTo(section: 'health' | 'eco', idx: number) {
    if (section === 'health') {
      if (healthTasks.length) setHealthIndex(((idx % healthTasks.length) + healthTasks.length) % healthTasks.length);
    } else {
      if (ecoTasks.length) setEcoIndex(((idx % ecoTasks.length) + ecoTasks.length) % ecoTasks.length);
    }
  }
  function goToById(section: 'health' | 'eco', id: string) {
    if (section === 'health') setHealthIndex(indexById(healthTasks, id));
    else setEcoIndex(indexById(ecoTasks, id));
  }

  // >>> SOUND + CONFETTI + SNAPSHOT + NOTIFY (only when flipping to completed)
  function handleToggleAndAutoAdvance(section: 'health' | 'eco') {
    if (section === 'health') {
      setHealthTasks((prev) => {
        if (!prev.length) return prev;
        const idx = healthIndexRef.current;
        const current = prev[idx];
        if (!current) return prev;
        const wasCompleted = current.completed;
        const updated = prev.map((t, i) => (i === idx ? { ...t, completed: !t.completed } : t));

        localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(updated));
        playClickIfEnabled();

        if (!wasCompleted) {
          // === Trigger the pink pulse behind the Health card ===
          triggerHealthPulse();

          celebrateIfEnabled();
          setRecentHealth((old) => pushRecent(old, current.id));

          window.dispatchEvent(
            new CustomEvent('notify', {
              detail: {
                title: 'Health task completed',
                description: `${current.label}  +${current.points} pts`,
                level: 'success',
                href: '/tasks?section=health',
              },
            })
          );

          // Award points only the first time this task is completed today
          if (!awardedIdsRef.current.includes(current.id)) {
            const nextAwarded = awardedTodayRef.current + current.points;
            setAwardedToday(nextAwarded);
            const nextIds = Array.from(new Set([current.id, ...awardedIdsRef.current]));
            setAwardedIds(nextIds);
            try {
              localStorage.setItem(AWARDED_TODAY_KEY, String(nextAwarded));
              localStorage.setItem(AWARDED_IDS_KEY, JSON.stringify(nextIds));
            } catch {}
            // Insert into task_completions table
            if (userId) {
              void supabase.from('task_completions').insert({
                user_id: userId,
                task_id: current.id,
                points: current.points,
              });
              // Refetch total points from task_completions
              void refetchTotalPoints();
            }
            // Push to Supabase and reflect locally
            // Update DB and immediately update local state
            applyPointsDelta(current.points, 1).then(() => {
              // Force refresh the points display by fetching latest from DB
              refetchTodaysPoints();
            });
            setTodaysDbPoints((prev) => (prev ?? 0) + current.points);
            setTotalDbTasks((prev) => (typeof prev === 'number' ? prev + 1 : prev));

            // Milestone notification based on awarded points
            if (Math.floor(nextAwarded / 100) > Math.floor((nextAwarded - current.points) / 100)) {
              const hit = Math.floor(nextAwarded / 100) * 100;
              try {
                window.dispatchEvent(
                  new CustomEvent('notify', {
                    detail: {
                      title: 'Points milestone reached',
                      description: `Nice! You hit ${hit} pts today.`,
                      level: 'success',
                      href: '/dashboard',
                    },
                  })
                );
              } catch {}
            }
          }

          const entry = buildEntry(
            updated,
            ecoTasksRef.current,
            awardedTodayRef.current + (!awardedIdsRef.current.includes(current.id) ? current.points : 0),
            undefined,
            { section: 'health', taskId: current.id, completed: true }
          );
          saveEntryToStorage(entry);
          setHealthIndex(() => findNextIncompleteIndex(updated, idx));
        } else {
          // Undo path: reverse points if they were awarded
          if (awardedIdsRef.current.includes(current.id)) {
            const nextAwarded = Math.max(0, awardedTodayRef.current - current.points);
            setAwardedToday(nextAwarded);
            const nextIds = awardedIdsRef.current.filter((id) => id !== current.id);
            setAwardedIds(nextIds);
            try {
              localStorage.setItem(AWARDED_TODAY_KEY, String(nextAwarded));
              localStorage.setItem(AWARDED_IDS_KEY, JSON.stringify(nextIds));
            } catch {}
            applyPointsDelta(-current.points, -1).then(() => {
              refetchTodaysPoints();
            });
            setTodaysDbPoints((prev) => Math.max(0, (prev ?? 0) - current.points));
            setTotalDbTasks((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
          }
        }
        return updated;
      });
    } else {
      setEcoTasks((prev) => {
        if (!prev.length) return prev;
        const idx = ecoIndexRef.current;
        const current = prev[idx];
        if (!current) return prev;
        const wasCompleted = current.completed;
        const updated = prev.map((t, i) => (i === idx ? { ...t, completed: !t.completed } : t));

        localStorage.setItem(STORAGE_KEYS.ECO, JSON.stringify(updated));
        playClickIfEnabled();

        if (!wasCompleted) {
          // === Trigger the green pulse behind the Eco card ===
          triggerEcoPulse();

          celebrateIfEnabled();
          setRecentEco((old) => pushRecent(old, current.id));

          window.dispatchEvent(
            new CustomEvent('notify', {
              detail: {
                title: 'Eco task completed',
                description: `${current.label}  +${current.points} pts`,
                level: 'success',
                href: '/tasks?section=eco',
              },
            })
          );

          if (!awardedIdsRef.current.includes(current.id)) {
            const nextAwarded = awardedTodayRef.current + current.points;
            setAwardedToday(nextAwarded);
            const nextIds = Array.from(new Set([current.id, ...awardedIdsRef.current]));
            setAwardedIds(nextIds);
            try {
              localStorage.setItem(AWARDED_TODAY_KEY, String(nextAwarded));
              localStorage.setItem(AWARDED_IDS_KEY, JSON.stringify(nextIds));
            } catch {}
            // Insert into task_completions table
            if (userId) {
              void supabase.from('task_completions').insert({
                user_id: userId,
                task_id: current.id,
                points: current.points,
              });
              // Refetch total points from task_completions
              void refetchTotalPoints();
            }
            applyPointsDelta(current.points, 1).then(() => {
              refetchTodaysPoints();
            });
            setTodaysDbPoints((prev) => (prev ?? 0) + current.points);
            setTotalDbTasks((prev) => (typeof prev === 'number' ? prev + 1 : prev));

            if (Math.floor(nextAwarded / 100) > Math.floor((nextAwarded - current.points) / 100)) {
              const hit = Math.floor(nextAwarded / 100) * 100;
              try {
                window.dispatchEvent(
                  new CustomEvent('notify', {
                    detail: {
                      title: 'Points milestone reached',
                      description: `Nice! You hit ${hit} pts today.`,
                      level: 'success',
                      href: '/dashboard',
                    },
                  })
                );
              } catch {}
            }
          }

          const entry = buildEntry(
            healthTasksRef.current,
            updated,
            awardedTodayRef.current + (!awardedIdsRef.current.includes(current.id) ? current.points : 0),
            undefined,
            { section: 'eco', taskId: current.id, completed: true }
          );
          saveEntryToStorage(entry);
          setEcoIndex(() => findNextIncompleteIndex(updated, idx));
        } else {
          if (awardedIdsRef.current.includes(current.id)) {
            const nextAwarded = Math.max(0, awardedTodayRef.current - current.points);
            setAwardedToday(nextAwarded);
            const nextIds = awardedIdsRef.current.filter((id) => id !== current.id);
            setAwardedIds(nextIds);
            try {
              localStorage.setItem(AWARDED_TODAY_KEY, String(nextAwarded));
              localStorage.setItem(AWARDED_IDS_KEY, JSON.stringify(nextIds));
            } catch {}
            applyPointsDelta(-current.points, -1).then(() => {
              refetchTodaysPoints();
            });
            setTodaysDbPoints((prev) => Math.max(0, (prev ?? 0) - current.points));
            setTotalDbTasks((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
          }
        }
        return updated;
      });
    }
  }

  const streakActive = dailyLog[dateKey()] === true;

  /* ---- small UI helpers ---- */
  function ModeToggle({
    section,
    mode,
  }: {
    section: 'health' | 'eco';
    mode: ViewMode;
  }) {
    const a = accent(section);
    const setMode = (m: ViewMode) => setModeAndAlign(section, m);
    return (
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
        <Button
          size="sm"
          variant={mode === 'browse' ? 'default' : 'ghost'}
          onClick={() => setMode('browse')}
          className={`${mode === 'browse' ? a.buttonActive : ''}`}
          aria-pressed={mode === 'browse'}
        >
          Browse
        </Button>
        <Button
          size="sm"
          variant={mode === 'focus' ? 'default' : 'ghost'}
          onClick={() => setMode('focus')}
          className={`${mode === 'focus' ? a.buttonActive : ''}`}
          aria-pressed={mode === 'focus'}
        >
          Focus
        </Button>
      </div>
    );
  }

  function RecentChips({
    section,
    recents,
    tasks,
  }: {
    section: 'health' | 'eco';
    recents: string[];
    tasks: Task[];
  }) {
    if (!recents.length) return null;
    const a = accent(section);
    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <History className="h-3.5 w-3.5" /> Recently completed:
        </span>
        <div className="flex flex-wrap gap-2">
          {recents.map((id) => {
            const t = tasks.find((x) => x.id === id);
            if (!t) return null;
            return (
              <button
                key={`${section}-recent-${id}`}
                onClick={() => goToById(section, id)}
                className={`px-2.5 py-1 rounded-full ${a.chipBg} hover:bg-slate-100 ${a.chipText}`}
                title={t.label}
              >
                {t.label.length > 22 ? `${t.label.slice(0, 22)}…` : t.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function DetailsPanel({
    details,
    section,
  }: {
    details?: TaskDetails;
    section: 'health' | 'eco';
  }) {
    if (!details) return null;
    const a = accent(section);
    return (
      <div className={`relative mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden`}>
        <div className={`h-1 w-full bg-gradient-to-r ${a.headerBar}`} />
        <div className="flex items-start justify-between px-4 sm:px-5 pt-4">
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1 rounded-full ${a.badgeBg} ${a.badgeText} px-2 py-0.5 text-[11px]`}>
              <Lightbulb className="h-3.5 w-3.5" />
              In Focus
            </div>
            <div className="flex items-center gap-1 text-slate-900 font-semibold">
              <Info className="h-4 w-4" />
              Why this task matters
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-5 pb-4 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">What it is</p>
              <p className="text-sm text-slate-800">{details.about}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Health benefits</p>
              <p className="text-sm text-slate-800">{details.health}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Environmental impact</p>
              <p className="text-sm text-slate-800">{details.environment}</p>
            </div>

            {details.tips?.length ? (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Pro tips</p>
                <ul className="mt-1 space-y-1.5">
                  {details.tips.map((t, i) => (
                    <li key={`tip-${i}`} className="flex items-start gap-2 text-sm text-slate-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ----- dynamic TopBar subtitle from profile -----
  const topSubtitle = useMemo(() => {
    const name = profile?.name?.trim();
    if (name) return `Welcome, ${name}`;
    return 'Track your progress and stay motivated';
  }, [profile]);

  return (
    <div className="relative flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Dashboard" subtitle={topSubtitle} />

        <main className="mx-auto max-w-6xl py-8 px-4">
          {/* Top stats row */}
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-12 items-stretch">
            {/* Today's Points */}
            <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">
                    Today's Points
                    {isSavingPoints && (
                      <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                        <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    )}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">{todaysPoints}</p>
                  {totalPointsFromDb !== null && (
                    <p className="text-xs text-slate-500 mt-1">Total: {totalPointsFromDb}</p>
                  )}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>

              {/* progressive milestone */}
              <div className={`mt-3 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs ${milestone.pillClass}`}>
                <Sparkles className="h-4 w-4" />
                <span>{milestone.message}</span>
              </div>

              {/* Leaderboard gap (Monthly-based) */}
              <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-50 text-emerald-700 px-2 py-1 text-xs">
                <ArrowUpRight className="h-4 w-4" />
                {myRank === 1 ? (
                  <span>You’re #1 — keep pushing!</span>
                ) : (
                  <span>
                    Rank #{myRank} • {gap} pts to pass {nextName}
                  </span>
                )}
              </div>
            </div>

            {/* Current Streak */}
            <div className="md:col-span-6 rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Current Streak</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-slate-900">{currentStreak}</p>
                    <span className="text-sm text-slate-500">day{currentStreak === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                  <Flame className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              {streakActive ? (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                  <Flame className="h-4 w-4" /> Active today — keep it going!
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Complete at least one task today to keep your streak alive.
                </p>
              )}
            </div>

            {/* Total Tasks */}
            <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-slate-900">{totalTasksDisplay}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Task Cards */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Real-world Impact Card */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white/90 border border-slate-100 p-5">
                <p className="text-xs font-medium text-emerald-600 mb-1">Real-world impact</p>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Today your actions saved {pointsToImpact(todaysPoints).kgCO2} kg CO₂
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  That's like planting <span className="font-semibold">{pointsToImpact(todaysPoints).trees}</span> trees 🌳 or saving{' '}
                  <span className="font-semibold">{pointsToImpact(todaysPoints).waterLiters}L</span> of water.
                </p>
                <p className="text-xs text-slate-500">
                  At this pace you'll save {forecastImpact([80, 90, 110, 130, 125, 100, 120]).kgCO2} kg CO₂ this week. (Predictive Intelligence)
                </p>
              </div>
            </div>

            {/* Health */}
            <div className="relative">
              {/* Pulsing ring sits behind the card when triggered */}
              {healthPulse && (
                <span
                  key={healthPulseKey}
                  className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-pink-500/70 ew-pulse-ring-pink"
                  aria-hidden="true"
                />
              )}

              <DashboardCard
                title="Health Tasks"
                description="Focus on one task at a time or browse freely"
                icon={Heart}
                iconColor="text-pink-600"
                iconBgColor="bg-pink-100"
              >
                {/* Mode + Progress + Reset */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {healthCompleted}/{healthTasks.length} completed
                  </div>
                  <div className="flex items-center gap-2">
                    <ModeToggle section="health" mode={healthMode} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset('health')}
                      aria-label="Reset all Health tasks"
                      title="Reset all Health tasks"
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${accent('health').progress} transition-all`}
                    style={{ width: `${healthTasks.length ? (healthCompleted / healthTasks.length) * 100 : 0}%` }}
                  />
                </div>
                <RecentChips section="health" recents={recentHealth} tasks={healthTasks} />

                {healthTasks.length ? (
                  <>
                    {/* Current task */}
                    <div className="mt-4">
                      <CurrentTaskCard
                        section="health"
                        task={healthTasks[healthIndex]}
                        index={healthIndex}
                        total={healthTasks.length}
                        onToggle={() => handleToggleAndAutoAdvance('health')}
                        focusActive={healthMode === 'focus'}
                      />

                      {/* Carousel Controls */}
                      <div className="mt-3 flex items-center justify-between">
                        <Button size="icon" variant="outline" onClick={() => prev('health')} aria-label="Previous health task">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {healthTasks.map((t, i) => (
                            <button
                              key={`h-dot-${t.id}`}
                              aria-label={`Go to health task ${i + 1}`}
                              onClick={() => goTo('health', i)}
                              className={`h-2.5 w-2.5 rounded-full transition
                              ${i === healthIndex
                                ? accent('health').dotActive
                                : t.completed
                                ? accent('health').dotDone
                                : 'bg-slate-300 hover:bg-slate-400'}`}
                            />
                          ))}
                        </div>
                        <Button size="icon" variant="outline" onClick={() => next('health')} aria-label="Next health task">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Focus mode details */}
                      {healthMode === 'focus' && (
                        <DetailsPanel details={healthTasks[healthIndex]?.details} section="health" />
                      )}

                      {/* All done helper */}
                      {healthAllDone && (
                        <p className="mt-2 text-xs text-slate-500">
                          All tasks complete. Use <span className="font-medium">Browse</span> to review or edit.
                        </p>
                      )}
                    </div>

                    <Button className="mt-4 w-full" variant="ghost" asChild>
                      <Link href="/tasks?section=health">View All Health Tasks</Link>
                    </Button>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No health tasks.</p>
                )}
              </DashboardCard>
            </div>

            {/* Eco */}
            <div className="relative">
              {/* Pulsing ring sits behind the card when triggered */}
              {ecoPulse && (
                <span
                  key={ecoPulseKey}
                  className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-green-500/70 ew-pulse-ring-green"
                  aria-hidden="true"
                />
              )}

              <DashboardCard
                title="Eco Tasks"
                description="Make a positive environmental impact today"
                icon={Leaf}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
              >
                {/* Mode + Progress + Reset */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {ecoCompleted}/{ecoTasks.length} completed
                  </div>
                  <div className="flex items-center gap-2">
                    <ModeToggle section="eco" mode={ecoMode} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset('eco')}
                      aria-label="Reset all Eco tasks"
                      title="Reset all Eco tasks"
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${accent('eco').progress} transition-all`}
                    style={{ width: `${ecoTasks.length ? (ecoCompleted / ecoTasks.length) * 100 : 0}%` }}
                  />
                </div>
                <RecentChips section="eco" recents={recentEco} tasks={ecoTasks} />

                {ecoTasks.length ? (
                  <>
                    {/* Current task */}
                    <div className="mt-4">
                      <CurrentTaskCard
                        section="eco"
                        task={ecoTasks[ecoIndex]}
                        index={ecoIndex}
                        total={ecoTasks.length}
                        onToggle={() => handleToggleAndAutoAdvance('eco')}
                        focusActive={ecoMode === 'focus'}
                      />

                      {/* Carousel Controls */}
                      <div className="mt-3 flex items-center justify-between">
                        <Button size="icon" variant="outline" onClick={() => prev('eco')} aria-label="Previous eco task">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {ecoTasks.map((t, i) => (
                            <button
                              key={`e-dot-${t.id}`}
                              aria-label={`Go to eco task ${i + 1}`}
                              onClick={() => goTo('eco', i)}
                              className={`h-2.5 w-2.5 rounded-full transition
                              ${i === ecoIndex
                                ? accent('eco').dotActive
                                : t.completed
                                ? accent('eco').dotDone
                                : 'bg-slate-300 hover:bg-slate-400'}`}
                            />
                          ))}
                        </div>
                        <Button size="icon" variant="outline" onClick={() => next('eco')} aria-label="Next eco task">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Focus mode details */}
                      {ecoMode === 'focus' && (
                        <DetailsPanel details={ecoTasks[ecoIndex]?.details} section="eco" />
                      )}

                      {ecoAllDone && (
                        <p className="mt-2 text-xs text-slate-500">
                          All tasks complete. Use <span className="font-medium">Browse</span> to review or edit.
                        </p>
                      )}
                    </div>

                    <Button className="mt-4 w-full" variant="ghost" asChild>
                      <Link href="/tasks?section=eco">View All Eco Tasks</Link>
                    </Button>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No eco tasks.</p>
                )}
              </DashboardCard>
            </div>
          </div>
        </main>
      </div>

      {/* Global CSS for the pulsing rings behind the cards */}
      <style jsx global>{`
        @keyframes ewPulseRingPink {
          0% { opacity: 0.9; transform: scale(1); }
          60% { opacity: 0.35; transform: scale(1.04); }
          100% { opacity: 0; transform: scale(1.07); }
        }
        .ew-pulse-ring-pink {
          animation: ewPulseRingPink 0.9s cubic-bezier(0.4, 0, 0.2, 1) both;
          box-shadow: 0 0 0 0 rgba(244, 114, 182, 0.35); /* pink-400 */
        }

        @keyframes ewPulseRingGreen {
          0% { opacity: 0.9; transform: scale(1); }
          60% { opacity: 0.35; transform: scale(1.04); }
          100% { opacity: 0; transform: scale(1.07); }
        }
        .ew-pulse-ring-green {
          animation: ewPulseRingGreen 0.9s cubic-bezier(0.4, 0, 0.2, 1) both;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); /* green-500 */
        }
      `}</style>
    </div>
  );
}
