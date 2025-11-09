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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS, celebrateIfEnabled, playClickIfEnabled } from '@/lib/earthwise';

/* ---------------- Types ---------------- */
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
    points: number;
    completedCount: number;
    healthCompleted: number;
    ecoCompleted: number;
  };
  health: SnapshotTask[];
  eco: SnapshotTask[];
  // optional metadata about what triggered the save
  action?: { section: 'health' | 'eco' | 'rollover'; taskId?: string; completed?: boolean };
};

const ENTRIES_KEY = 'EW_ENTRIES_V1';
const ENTRIES_LIMIT = 180; // keep ~6 months of daily snapshots by default

/* ---------------- Scoring / UI constants ---------------- */
const BASE_POINTS = 240;
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
      'Associated with lower all-ccause mortality and better cardiometabolic health; breaks up sedentary time.',
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
  dateOverride?: string,
  action?: DayEntry['action']
): DayEntry {
  const completedCount = [...health, ...eco].filter((t) => t.completed).length;
  const points = [...health, ...eco].reduce((s, t) => s + (t.completed ? t.points : 0), BASE_POINTS);

  return {
    id: uuid(),
    date: dateOverride ?? dateKey(),
    ts: Date.now(),
    totals: {
      points,
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

/* ===========================
   Dashboard Page
   =========================== */
export default function DashboardPage() {
  const defaultHealth: Task[] = attachDetails(
    [
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
    ],
    HEALTH_DETAILS
  );
  const defaultEco: Task[] = attachDetails(
    [
      { id: 'meatless-meal', label: 'Meatless meal', points: 25, completed: false },
      { id: 'cold-wash-laundry', label: 'Cold-wash laundry', points: 15, completed: false },
      { id: 'short-shower-5', label: '5-minute shower', points: 15, completed: false },
      { id: 'unplug-standby', label: 'Unplug idle devices', points: 10, completed: false },
      { id: 'thermostat-1deg', label: 'Thermostat ±1°F adjustment', points: 15, completed: false },
      { id: 'reusable-mug-bottle', label: 'Bring a reusable mug/bottle', points: 10, completed: false },
      { id: 'recycle-sort', label: 'Sort & recycle properly', points: 10, completed: false },
      { id: 'compost-scraps', label: 'Compost food scraps', points: 20, completed: false },
      { id: 'public-transit-carpool', label: 'Use public transit or carpool', points: 30, completed: false },
      { id: 'no-single-use-plastic', label: 'No single-use plastic today', points: 25, completed: false },
    ],
    ECO_DETAILS
  );

  const [healthTasks, setHealthTasks] = useState<Task[]>(defaultHealth);
  const [ecoTasks, setEcoTasks] = useState<Task[]>(defaultEco);
  const [dailyLog, setDailyLog] = useState<DailyLog>({});

  const [healthIndex, setHealthIndex] = useState<number>(0);
  const [ecoIndex, setEcoIndex] = useState<number>(0);

  // Indices ref (avoid stale closures)
  const healthIndexRef = useRef(0);
  const ecoIndexRef = useRef(0);
  useEffect(() => { healthIndexRef.current = healthIndex; }, [healthIndex]);
  useEffect(() => { ecoIndexRef.current = ecoIndex; }, [ecoIndex]);

  // New: keep *task arrays* in refs so snapshot uses fresh other-section state
  const healthTasksRef = useRef<Task[]>(defaultHealth);
  const ecoTasksRef = useRef<Task[]>(defaultEco);
  useEffect(() => { healthTasksRef.current = healthTasks; }, [healthTasks]);
  useEffect(() => { ecoTasksRef.current = ecoTasks; }, [ecoTasks]);

  const [healthMode, setHealthMode] = useState<ViewMode>('browse');
  const [ecoMode, setEcoMode] = useState<ViewMode>('browse');

  const [recentHealth, setRecentHealth] = useState<string[]>([]);
  const [recentEco, setRecentEco] = useState<string[]>([]);

  /* ---- load persisted ---- */
  useEffect(() => {
    try {
      const hRaw = localStorage.getItem(STORAGE_KEYS.HEALTH);
      const eRaw = localStorage.getItem(STORAGE_KEYS.ECO);
      const logRaw = localStorage.getItem(STORAGE_KEYS.LOG);
      const lastOpenRaw = localStorage.getItem(STORAGE_KEYS.LAST_OPEN);
      const rhRaw = localStorage.getItem(STORAGE_KEYS.RECENT_HEALTH);
      const reRaw = localStorage.getItem(STORAGE_KEYS.RECENT_ECO);
      const hmRaw = localStorage.getItem(STORAGE_KEYS.MODE_HEALTH);
      const emRaw = localStorage.getItem(STORAGE_KEYS.MODE_ECO);

      const h = hRaw ? attachDetails(JSON.parse(hRaw) as Task[], HEALTH_DETAILS) : defaultHealth;
      const e = eRaw ? attachDetails(JSON.parse(eRaw) as Task[], ECO_DETAILS) : defaultEco;

      const log = logRaw ? (JSON.parse(logRaw) as DailyLog) : {};
      const rh = rhRaw ? (JSON.parse(rhRaw) as string[]) : [];
      const re = reRaw ? (JSON.parse(reRaw) as string[]) : [];

      const hm: ViewMode = hmRaw === 'focus' ? 'focus' : 'browse';
      const em: ViewMode = emRaw === 'focus' ? 'focus' : 'browse';

      const todayK = dateKey();

      // New: if day rolled over, snapshot yesterday's final state before resetting
      if (lastOpenRaw && lastOpenRaw !== todayK) {
        const rolloverEntry = buildEntry(h, e, lastOpenRaw, { section: 'rollover' });
        saveEntryToStorage(rolloverEntry);

        const reset = (tasks: Task[]) => tasks.map((t) => ({ ...t, completed: false }));
        setHealthTasks(reset(h));
        setEcoTasks(reset(e));
        setHealthIndex(0);
        setEcoIndex(0);
        setRecentHealth([]);
        setRecentEco([]);
      } else {
        setHealthTasks(h);
        setEcoTasks(e);
        setRecentHealth(rh);
        setRecentEco(re);
      }

      setHealthMode(hm);
      setEcoMode(em);

      setDailyLog(pruneLog(log));
      localStorage.setItem(STORAGE_KEYS.LAST_OPEN, todayK);
    } catch {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Align once on first render so we start on an incomplete item if needed
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

  const todaysPoints = useMemo(() => {
    const extra = [...healthTasks, ...ecoTasks].reduce(
      (sum, t) => sum + (t.completed ? t.points : 0),
      0
    );
    return BASE_POINTS + extra;
  }, [healthTasks, ecoTasks]);

  const totalTasksDisplay = useMemo(
    () => BASE_TOTAL_TASKS + completedCountToday,
    [completedCountToday]
  );

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
      const ce = e as CustomEvent<{ key?: string; value?: string }>;
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

  // >>> SOUND + CONFETTI + SNAPSHOT (only when flipping to completed)
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
        window.dispatchEvent(
          new CustomEvent('taskStateUpdate', {
            detail: { key: STORAGE_KEYS.HEALTH, value: JSON.stringify(updated) },
          })
        );

        playClickIfEnabled();

        // New: only snapshot when changing to "completed"
        if (!wasCompleted) {
          celebrateIfEnabled();
          setRecentHealth((old) => pushRecent(old, current.id));

          // Snapshot full state (health AFTER update, eco current)
          const entry = buildEntry(updated, ecoTasksRef.current, undefined, {
            section: 'health',
            taskId: current.id,
            completed: true,
          });
          saveEntryToStorage(entry);

          setHealthIndex(() => findNextIncompleteIndex(updated, idx));
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
        window.dispatchEvent(
          new CustomEvent('taskStateUpdate', {
            detail: { key: STORAGE_KEYS.ECO, value: JSON.stringify(updated) },
          })
        );

        playClickIfEnabled();

        if (!wasCompleted) {
          celebrateIfEnabled();
          setRecentEco((old) => pushRecent(old, current.id));

          // Snapshot full state (eco AFTER update, health current)
          const entry = buildEntry(healthTasksRef.current, updated, undefined, {
            section: 'eco',
            taskId: current.id,
            completed: true,
          });
          saveEntryToStorage(entry);

          setEcoIndex(() => findNextIncompleteIndex(updated, idx));
        }
        return updated;
      });
    }
  }

  const streakLabel = `${currentStreak} day${currentStreak === 1 ? '' : 's'}`;
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

  function PointsPill({ points }: { points?: number }) {
    if (typeof points !== 'number') return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Sparkles className="h-3.5 w-3.5" />
        +{points} pts
      </span>
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
        {/* Accent header bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${a.headerBar}`} />
        {/* Header */}
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

        {/* Content grid */}
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

  /* ---- current task panel (with accent ring in focus) ---- */
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
        {/* subtle corner accent */}
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

  return (
    <div className="relative flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Dashboard" subtitle="Track your progress and stay motivated" />

        <main className="mx-auto max-w-6xl py-8 px-4">
          {/* Top stats row (aligned) */}
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-12 items-stretch">
            {/* Today's Points */}
            <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-slate-600">Today's Points</p>
                  <p className="text-3xl font-bold text-slate-900">{todaysPoints}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Current Streak (summary card) */}
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
            {/* Health */}
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

            {/* Eco */}
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
        </main>
      </div>
    </div>
  );
}
