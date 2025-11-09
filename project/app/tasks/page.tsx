'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import PageShell from '@/components/PageShell';
import DashboardCard from '@/components/DashboardCard';
import {
  Heart,
  Leaf,
  CalendarDays,
  RotateCcw,
  Plus,
  Pencil,
  Save,
  X,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS, celebrateIfEnabled, playClickIfEnabled } from '@/lib/earthwise';

type Task = {
  id: string;
  label: string;
  points: number;
  completed: boolean;
};

type DailyLog = Record<string, boolean>; // YYYY-MM-DD -> completed?

const DAILY_COMPLETION_THRESHOLD = 1;

/* ---- Tomorrow planning keys (non-breaking addition) ---- */
const PLAN_TOMORROW_HEALTH_KEY = 'EW_PLAN_TOMORROW_HEALTH_V1';
const PLAN_TOMORROW_ECO_KEY = 'EW_PLAN_TOMORROW_ECO_V1';

type SortMode = 'default' | 'points_desc' | 'alpha' | 'incomplete_first';

function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
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
function formatNice(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function saveAndNotify(key: string, valueObj: unknown) {
  const value = JSON.stringify(valueObj);
  localStorage.setItem(key, value);
  window.dispatchEvent(
    new CustomEvent('taskStateUpdate', {
      detail: { key, value },
    })
  );
}

export default function TasksPage() {
  const defaultHealth: Task[] = [
    { id: 'yoga-20',            label: '20-minute yoga',                      points: 20, completed: false },
    { id: 'strength-15',        label: '15-minute strength training',         points: 25, completed: false },
    { id: 'intervals-10',       label: '10-minute intervals',                 points: 20, completed: false },
    { id: 'healthy-breakfast',  label: 'Healthy breakfast (protein + fruit)', points: 15, completed: false },
    { id: 'steps-8000',         label: '8,000 steps',                         points: 25, completed: false },
    { id: 'sleep-8h',           label: 'Sleep 8 hours',                       points: 30, completed: false },
    { id: 'screen-breaks',      label: 'Screen breaks every hour',            points: 10, completed: false },
    { id: 'journaling-5',       label: '5-minute journaling',                 points: 10, completed: false },
    { id: 'breathing-3',        label: '3-minute breathing exercise',         points: 10, completed: false },
    { id: 'posture-x3',         label: 'Posture check ×3',                    points: 5,  completed: false },
  ];

  const defaultEco: Task[] = [
    { id: 'meatless-meal',          label: 'Meatless meal',                         points: 25, completed: false },
    { id: 'cold-wash-laundry',      label: 'Cold-wash laundry',                     points: 15, completed: false },
    { id: 'short-shower-5',         label: '5-minute shower',                       points: 15, completed: false },
    { id: 'unplug-standby',         label: 'Unplug idle devices',                   points: 10, completed: false },
    { id: 'thermostat-1deg',        label: 'Thermostat ±1°F adjustment',            points: 15, completed: false },
    { id: 'reusable-mug-bottle',    label: 'Bring reusable mug/bottle',             points: 10, completed: false },
    { id: 'recycle-sort',           label: 'Sort & recycle properly',               points: 10, completed: false },
    { id: 'compost-scraps',         label: 'Compost food scraps',                   points: 20, completed: false },
    { id: 'public-transit-carpool', label: 'Use public transit or carpool',         points: 30, completed: false },
    { id: 'no-single-use-plastic',  label: 'No single-use plastic today',           points: 25, completed: false },
  ];

  const [healthTasks, setHealthTasks] = useState<Task[]>(defaultHealth);
  const [ecoTasks, setEcoTasks] = useState<Task[]>(defaultEco);
  const [dailyLog, setDailyLog] = useState<DailyLog>({});

  // Tomorrow plan (optional saved lists)
  const [plannedHealth, setPlannedHealth] = useState<Task[] | null>(null);
  const [plannedEco, setPlannedEco] = useState<Task[] | null>(null);

  // UI controls per section
  const [healthSort, setHealthSort] = useState<SortMode>('default');
  const [ecoSort, setEcoSort] = useState<SortMode>('default');
  const [healthQuery, setHealthQuery] = useState('');
  const [ecoQuery, setEcoQuery] = useState('');

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPoints, setEditPoints] = useState<number>(10);

  // Add-new states
  const [newHealthLabel, setNewHealthLabel] = useState('');
  const [newHealthPoints, setNewHealthPoints] = useState<number>(10);
  const [newEcoLabel, setNewEcoLabel] = useState('');
  const [newEcoPoints, setNewEcoPoints] = useState<number>(10);

  const router = useRouter();
  const searchParams = useSearchParams();

  const viewingTomorrow = (searchParams.get('when') || '').toLowerCase() === 'tomorrow';
  const today = new Date();
  const tomorrow = addDays(today, 1);

  useEffect(() => {
    try {
      const hRaw = localStorage.getItem(STORAGE_KEYS.HEALTH);
      const eRaw = localStorage.getItem(STORAGE_KEYS.ECO);
      const logRaw = localStorage.getItem(STORAGE_KEYS.LOG);
      const lastOpenRaw = localStorage.getItem(STORAGE_KEYS.LAST_OPEN);

      const planHRaw = localStorage.getItem(PLAN_TOMORROW_HEALTH_KEY);
      const planERaw = localStorage.getItem(PLAN_TOMORROW_ECO_KEY);

      const h = hRaw ? (JSON.parse(hRaw) as Task[]) : defaultHealth;
      const e = eRaw ? (JSON.parse(eRaw) as Task[]) : defaultEco;
      const log = logRaw ? (JSON.parse(logRaw) as DailyLog) : {};

      if (planHRaw) setPlannedHealth(JSON.parse(planHRaw) as Task[]);
      if (planERaw) setPlannedEco(JSON.parse(planERaw) as Task[]);

      const todayK = dateKey();

      if (lastOpenRaw && lastOpenRaw !== todayK) {
        const reset = (tasks: Task[]) => tasks.map(t => ({ ...t, completed: false }));
        setHealthTasks(reset(h));
        setEcoTasks(reset(e));
      } else {
        setHealthTasks(h);
        setEcoTasks(e);
      }

      setDailyLog(pruneLog(log));
      localStorage.setItem(STORAGE_KEYS.LAST_OPEN, todayK);
    } catch {
      setHealthTasks(defaultHealth);
      setEcoTasks(defaultEco);
      setDailyLog({});
      localStorage.setItem(STORAGE_KEYS.LAST_OPEN, dateKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCountToday = useMemo(
    () => [...healthTasks, ...ecoTasks].filter(t => t.completed).length,
    [healthTasks, ecoTasks]
  );
  const todaysCompleted = completedCountToday >= DAILY_COMPLETION_THRESHOLD;

  const healthCompleted = useMemo(
    () => healthTasks.filter(t => t.completed).length,
    [healthTasks]
  );
  const ecoCompleted = useMemo(
    () => ecoTasks.filter(t => t.completed).length,
    [ecoTasks]
  );

  const healthPoints = useMemo(
    () => healthTasks.reduce((s, t) => s + (t.completed ? t.points : 0), 0),
    [healthTasks]
  );
  const healthPotential = useMemo(
    () => healthTasks.reduce((s, t) => s + t.points, 0),
    [healthTasks]
  );
  const ecoPoints = useMemo(
    () => ecoTasks.reduce((s, t) => s + (t.completed ? t.points : 0), 0),
    [ecoTasks]
  );
  const ecoPotential = useMemo(
    () => ecoTasks.reduce((s, t) => s + t.points, 0),
    [ecoTasks]
  );

  // cross-tab + same-window sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (viewingTomorrow) return;
      if (e.key === STORAGE_KEYS.HEALTH && e.newValue) {
        setHealthTasks(JSON.parse(e.newValue));
      } else if (e.key === STORAGE_KEYS.ECO && e.newValue) {
        setEcoTasks(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCustom = (e: Event) => {
      if (viewingTomorrow) return;
      const ce = e as CustomEvent<{ key?: string; value?: string }>;
      const { key, value } = ce.detail || {};
      if (!key || !value) return;
      if (key === STORAGE_KEYS.HEALTH) setHealthTasks(JSON.parse(value));
      if (key === STORAGE_KEYS.ECO) setEcoTasks(JSON.parse(value));
    };
    window.addEventListener('taskStateUpdate', handleCustom as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('taskStateUpdate', handleCustom as EventListener);
    };
  }, [viewingTomorrow]);

  useEffect(() => {
    if (!viewingTomorrow) localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(healthTasks));
  }, [healthTasks, viewingTomorrow]);
  useEffect(() => {
    if (!viewingTomorrow) localStorage.setItem(STORAGE_KEYS.ECO, JSON.stringify(ecoTasks));
  }, [ecoTasks, viewingTomorrow]);

  useEffect(() => {
    const todayK = dateKey();
    setDailyLog(prev => {
      const next = { ...prev, [todayK]: todaysCompleted };
      const pruned = pruneLog(next);
      localStorage.setItem(STORAGE_KEYS.LOG, JSON.stringify(pruned));
      return pruned;
    });
  }, [todaysCompleted]);

  /* -------------------- Helpers: filter + sort + display -------------------- */
  function applySort(arr: Task[], mode: SortMode): Task[] {
    if (mode === 'default') return arr;
    if (mode === 'points_desc') return [...arr].sort((a, b) => b.points - a.points);
    if (mode === 'alpha') return [...arr].sort((a, b) => a.label.localeCompare(b.label));
    if (mode === 'incomplete_first') return [...arr].sort((a, b) => Number(a.completed) - Number(b.completed));
    return arr;
  }
  function applyQuery(arr: Task[], q: string): Task[] {
    const s = q.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter(t => t.label.toLowerCase().includes(s));
  }

  // If tomorrow view: prefer planned lists (if present); force completed=false for preview
  const baseHealthForDisplay = viewingTomorrow
    ? (plannedHealth ?? healthTasks).map(t => ({ ...t, completed: false }))
    : healthTasks;
  const baseEcoForDisplay = viewingTomorrow
    ? (plannedEco ?? ecoTasks).map(t => ({ ...t, completed: false }))
    : ecoTasks;

  const displayedHealth = useMemo(
    () => applySort(applyQuery(baseHealthForDisplay, healthQuery), healthSort),
    [baseHealthForDisplay, healthQuery, healthSort]
  );
  const displayedEco = useMemo(
    () => applySort(applyQuery(baseEcoForDisplay, ecoQuery), ecoSort),
    [baseEcoForDisplay, ecoQuery, ecoSort]
  );

  /* -------------------- Routing + section anchor -------------------- */
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.getElementById(section);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [searchParams]);

  function setWhen(when: 'today' | 'tomorrow') {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (when === 'tomorrow') params.set('when', 'tomorrow');
    else params.delete('when');
    const qs = params.toString();
    const url = qs ? `/tasks?${qs}` : '/tasks';
    router.replace(url);
  }

  /* -------------------- Task mutations -------------------- */
  function toggleTask(section: 'health' | 'eco', id: string) {
    if (viewingTomorrow) return;
    playClickIfEnabled();

    if (section === 'health') {
      const updated = healthTasks.map(t => {
        if (t.id !== id) return t;
        const nowCompleted = !t.completed;
        if (!t.completed && nowCompleted) celebrateIfEnabled();
        return { ...t, completed: nowCompleted };
      });
      setHealthTasks(updated);
      saveAndNotify(STORAGE_KEYS.HEALTH, updated);
    } else {
      const updated = ecoTasks.map(t => {
        if (t.id !== id) return t;
        const nowCompleted = !t.completed;
        if (!t.completed && nowCompleted) celebrateIfEnabled();
        return { ...t, completed: nowCompleted };
      });
      setEcoTasks(updated);
      saveAndNotify(STORAGE_KEYS.ECO, updated);
    }
  }

  function resetSection(section: 'health' | 'eco') {
    if (viewingTomorrow) return;
    if (section === 'health') {
      const reset = healthTasks.map(t => ({ ...t, completed: false }));
      setHealthTasks(reset);
      saveAndNotify(STORAGE_KEYS.HEALTH, reset);
    } else {
      const reset = ecoTasks.map(t => ({ ...t, completed: false }));
      setEcoTasks(reset);
      saveAndNotify(STORAGE_KEYS.ECO, reset);
    }
  }

  function completeAll(section: 'health' | 'eco') {
    if (viewingTomorrow) return;
    if (section === 'health') {
      const next = healthTasks.map(t => ({ ...t, completed: true }));
      setHealthTasks(next);
      saveAndNotify(STORAGE_KEYS.HEALTH, next);
      celebrateIfEnabled();
    } else {
      const next = ecoTasks.map(t => ({ ...t, completed: true }));
      setEcoTasks(next);
      saveAndNotify(STORAGE_KEYS.ECO, next);
      celebrateIfEnabled();
    }
  }

  function addTask(section: 'health' | 'eco') {
    if (viewingTomorrow) return;
    const label = section === 'health' ? newHealthLabel.trim() : newEcoLabel.trim();
    const ptsRaw = section === 'health' ? newHealthPoints : newEcoPoints;
    const points = Number.isFinite(ptsRaw) ? Math.max(1, Math.min(200, Math.floor(ptsRaw))) : 10;
    if (!label) return;

    const newTask: Task = { id: uid(`custom-${section}`), label, points, completed: false };
    if (section === 'health') {
      const next = [...healthTasks, newTask];
      setHealthTasks(next);
      saveAndNotify(STORAGE_KEYS.HEALTH, next);
      setNewHealthLabel('');
      setNewHealthPoints(10);
    } else {
      const next = [...ecoTasks, newTask];
      setEcoTasks(next);
      saveAndNotify(STORAGE_KEYS.ECO, next);
      setNewEcoLabel('');
      setNewEcoPoints(10);
    }
  }

  function removeTask(section: 'health' | 'eco', id: string) {
    if (viewingTomorrow) return;
    if (section === 'health') {
      const next = healthTasks.filter(t => t.id !== id);
      setHealthTasks(next);
      saveAndNotify(STORAGE_KEYS.HEALTH, next);
    } else {
      const next = ecoTasks.filter(t => t.id !== id);
      setEcoTasks(next);
      saveAndNotify(STORAGE_KEYS.ECO, next);
    }
    if (editingId === id) setEditingId(null);
  }

  function beginEdit(task: Task) {
    if (viewingTomorrow) return;
    setEditingId(task.id);
    setEditLabel(task.label);
    setEditPoints(task.points);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function saveEdit(section: 'health' | 'eco', id: string) {
    if (viewingTomorrow) return;
    const label = editLabel.trim();
    const points = Math.max(1, Math.min(200, Math.floor(editPoints || 1)));
    if (!label) return;

    if (section === 'health') {
      const next = healthTasks.map(t => (t.id === id ? { ...t, label, points } : t));
      setHealthTasks(next);
      saveAndNotify(STORAGE_KEYS.HEALTH, next);
    } else {
      const next = ecoTasks.map(t => (t.id === id ? { ...t, label, points } : t));
      setEcoTasks(next);
      saveAndNotify(STORAGE_KEYS.ECO, next);
    }
    setEditingId(null);
  }

  function move(section: 'health' | 'eco', id: string, dir: -1 | 1) {
    if (viewingTomorrow) return;
    // Only allow when sort is Default (so reordering is intuitive)
    if ((section === 'health' && healthSort !== 'default') || (section === 'eco' && ecoSort !== 'default')) return;

    const arr = section === 'health' ? [...healthTasks] : [...ecoTasks];
    const idx = arr.findIndex(t => t.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    if (section === 'health') {
      setHealthTasks(arr);
      saveAndNotify(STORAGE_KEYS.HEALTH, arr);
    } else {
      setEcoTasks(arr);
      saveAndNotify(STORAGE_KEYS.ECO, arr);
    }
  }

  function planTomorrowFromToday() {
    // Copy today lists with completed=false into plan keys
    const h = healthTasks.map(t => ({ ...t, completed: false }));
    const e = ecoTasks.map(t => ({ ...t, completed: false }));
    localStorage.setItem(PLAN_TOMORROW_HEALTH_KEY, JSON.stringify(h));
    localStorage.setItem(PLAN_TOMORROW_ECO_KEY, JSON.stringify(e));
    setPlannedHealth(h);
    setPlannedEco(e);
    try {
      window.dispatchEvent(
        new CustomEvent('notify', {
          detail: {
            title: 'Tomorrow planned',
            description: 'Copied today’s lists to tomorrow (cleared).',
            level: 'success',
            href: '/tasks?when=tomorrow',
          },
        })
      );
    } catch {}
  }

  function clearTomorrowPlan() {
    localStorage.removeItem(PLAN_TOMORROW_HEALTH_KEY);
    localStorage.removeItem(PLAN_TOMORROW_ECO_KEY);
    setPlannedHealth(null);
    setPlannedEco(null);
  }

  const subTitle = viewingTomorrow
    ? `Preview of tomorrow's tasks (${formatNice(tomorrow)})`
    : `View and manage today's Health & Eco tasks (${formatNice(today)})`;

  /* -------------------- Small UI helpers -------------------- */
  function Toolbar({
    section,
    sort,
    setSort,
    query,
    setQuery,
    completedCount,
    totalCount,
    pointsEarned,
    pointsTotal,
    onReset,
    onCompleteAll,
  }: {
    section: 'health' | 'eco';
    sort: SortMode;
    setSort: (m: SortMode) => void;
    query: string;
    setQuery: (s: string) => void;
    completedCount: number;
    totalCount: number;
    pointsEarned: number;
    pointsTotal: number;
    onReset: () => void;
    onCompleteAll: () => void;
  }) {
    const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const sortDisabledHint =
      (section === 'health' && healthSort !== 'default') || (section === 'eco' && ecoSort !== 'default')
        ? ' (reorder disabled while sorted)'
        : '';

    return (
      <div className="mt-2 mb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {completedCount}/{totalCount} completed
            </span>
            <span className="text-slate-400">•</span>
            <span>
              {pointsEarned}/{pointsTotal} pts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="relative">
              <div className="absolute left-2 top-2.5">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                title={`Sort mode${sortDisabledHint}`}
              >
                <option value="default">Default</option>
                <option value="points_desc">Points ↓</option>
                <option value="alpha">A–Z</option>
                <option value="incomplete_first">Incomplete first</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              disabled={viewingTomorrow || completedCount === 0}
              title={viewingTomorrow ? 'Available tomorrow' : 'Reset all tasks in this section'}
              className="inline-flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCompleteAll}
              disabled={viewingTomorrow || completedCount === totalCount}
              title={viewingTomorrow ? 'Available tomorrow' : 'Mark all complete'}
              className="inline-flex items-center gap-1"
            >
              ✓ Complete All
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
            aria-label={`Progress ${pct}%`}
          />
        </div>
      </div>
    );
  }

  function AddTaskRow({
    section,
    label,
    setLabel,
    points,
    setPoints,
    onAdd,
  }: {
    section: 'health' | 'eco';
    label: string;
    setLabel: (s: string) => void;
    points: number;
    setPoints: (n: number) => void;
    onAdd: () => void;
  }) {
    return (
      <div className="mt-3 mb-2 flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Add a ${section === 'health' ? 'health' : 'eco'} task`}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          disabled={viewingTomorrow}
        />
        <input
          type="number"
          min={1}
          max={200}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-24 px-2 py-2 text-sm rounded-md border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          disabled={viewingTomorrow}
          title="Points"
        />
        <Button
          size="sm"
          onClick={onAdd}
          disabled={viewingTomorrow || !label.trim()}
          className="inline-flex items-center gap-1"
          title={viewingTomorrow ? 'Available tomorrow' : 'Add task'}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="All Tasks" subtitle={subTitle} />

        <PageShell className="max-w-6xl mx-auto py-8 px-4 space-y-8">
          {/* View switcher */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm font-medium">
                {viewingTomorrow ? 'Tomorrow (preview)' : 'Today'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!viewingTomorrow && (
                <>
                  <Button variant="outline" size="sm" onClick={planTomorrowFromToday} title="Copy today’s lists (cleared) into tomorrow preview">
                    Plan Tomorrow
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearTomorrowPlan} title="Remove saved tomorrow preview">
                    Clear Plan
                  </Button>
                </>
              )}
              <Button
                variant={viewingTomorrow ? 'outline' : 'default'}
                size="sm"
                onClick={() => setWhen('today')}
              >
                Today
              </Button>
              <Button
                variant={viewingTomorrow ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWhen('tomorrow')}
              >
                Tomorrow
              </Button>
            </div>
          </div>

          {/* Health */}
          <DashboardCard
            title="Health Tasks"
            description={viewingTomorrow ? "What you'll see tomorrow" : 'All wellness activities'}
            icon={Heart}
            iconColor="text-pink-600"
            iconBgColor="bg-pink-100"
          >
            <Toolbar
              section="health"
              sort={healthSort}
              setSort={setHealthSort}
              query={healthQuery}
              setQuery={setHealthQuery}
              completedCount={healthCompleted}
              totalCount={healthTasks.length}
              pointsEarned={healthPoints}
              pointsTotal={healthPotential}
              onReset={() => resetSection('health')}
              onCompleteAll={() => completeAll('health')}
            />

            <AddTaskRow
              section="health"
              label={newHealthLabel}
              setLabel={setNewHealthLabel}
              points={newHealthPoints}
              setPoints={setNewHealthPoints}
              onAdd={() => addTask('health')}
            />

            <div id="health" className="space-y-3">
              {displayedHealth.map(task => {
                const isEditing = editingId === task.id;
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    {/* Left: reorder + label */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col mr-1">
                        <button
                          className="disabled:opacity-40"
                          onClick={() => move('health', task.id, -1)}
                          disabled={viewingTomorrow || healthSort !== 'default'}
                          title={healthSort !== 'default' ? 'Reorder disabled while sorted' : 'Move up'}
                        >
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          className="disabled:opacity-40"
                          onClick={() => move('health', task.id, +1)}
                          disabled={viewingTomorrow || healthSort !== 'default'}
                          title={healthSort !== 'default' ? 'Reorder disabled while sorted' : 'Move down'}
                        >
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>

                      {!isEditing ? (
                        <span className="text-sm text-slate-700 truncate">
                          {task.label}
                          <span className="ml-2 text-xs text-slate-500">(+{task.points})</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            className="px-2 py-1 text-sm rounded-md border border-slate-300 bg-white/90"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                          />
                          <input
                            type="number"
                            min={1}
                            max={200}
                            className="w-20 px-2 py-1 text-sm rounded-md border border-slate-300 bg-white/90"
                            value={editPoints}
                            onChange={(e) => setEditPoints(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant={task.completed ? 'default' : 'outline'}
                            onClick={() => toggleTask('health', task.id)}
                            disabled={viewingTomorrow}
                            title={viewingTomorrow ? 'Available tomorrow' : task.completed ? 'Undo' : 'Complete'}
                          >
                            {viewingTomorrow ? 'Locked' : task.completed ? 'Undo' : 'Complete'}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => beginEdit(task)}
                            disabled={viewingTomorrow}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => removeTask('health', task.id)}
                            disabled={viewingTomorrow}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => saveEdit('health', task.id)}
                            title="Save"
                          >
                            <Save className="h-4 w-4 text-emerald-700" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={cancelEdit} title="Cancel">
                            <X className="h-4 w-4 text-slate-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          {/* Eco */}
          <DashboardCard
            title="Eco Tasks"
            description={viewingTomorrow ? "What you'll see tomorrow" : 'All sustainability actions'}
            icon={Leaf}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          >
            <Toolbar
              section="eco"
              sort={ecoSort}
              setSort={setEcoSort}
              query={ecoQuery}
              setQuery={setEcoQuery}
              completedCount={ecoCompleted}
              totalCount={ecoTasks.length}
              pointsEarned={ecoPoints}
              pointsTotal={ecoPotential}
              onReset={() => resetSection('eco')}
              onCompleteAll={() => completeAll('eco')}
            />

            <AddTaskRow
              section="eco"
              label={newEcoLabel}
              setLabel={setNewEcoLabel}
              points={newEcoPoints}
              setPoints={setNewEcoPoints}
              onAdd={() => addTask('eco')}
            />

            <div id="eco" className="space-y-3">
              {displayedEco.map(task => {
                const isEditing = editingId === task.id;
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    {/* Left: reorder + label */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col mr-1">
                        <button
                          className="disabled:opacity-40"
                          onClick={() => move('eco', task.id, -1)}
                          disabled={viewingTomorrow || ecoSort !== 'default'}
                          title={ecoSort !== 'default' ? 'Reorder disabled while sorted' : 'Move up'}
                        >
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          className="disabled:opacity-40"
                          onClick={() => move('eco', task.id, +1)}
                          disabled={viewingTomorrow || ecoSort !== 'default'}
                          title={ecoSort !== 'default' ? 'Reorder disabled while sorted' : 'Move down'}
                        >
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>

                      {!isEditing ? (
                        <span className="text-sm text-slate-700 truncate">
                          {task.label}
                          <span className="ml-2 text-xs text-slate-500">(+{task.points})</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            className="px-2 py-1 text-sm rounded-md border border-slate-300 bg-white/90"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                          />
                          <input
                            type="number"
                            min={1}
                            max={200}
                            className="w-20 px-2 py-1 text-sm rounded-md border border-slate-300 bg-white/90"
                            value={editPoints}
                            onChange={(e) => setEditPoints(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant={task.completed ? 'default' : 'outline'}
                            onClick={() => toggleTask('eco', task.id)}
                            disabled={viewingTomorrow}
                            title={viewingTomorrow ? 'Available tomorrow' : task.completed ? 'Undo' : 'Complete'}
                          >
                            {viewingTomorrow ? 'Locked' : task.completed ? 'Undo' : 'Complete'}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => beginEdit(task)}
                            disabled={viewingTomorrow}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => removeTask('eco', task.id)}
                            disabled={viewingTomorrow}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => saveEdit('eco', task.id)}
                            title="Save"
                          >
                            <Save className="h-4 w-4 text-emerald-700" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={cancelEdit} title="Cancel">
                            <X className="h-4 w-4 text-slate-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </PageShell>
      </div>
    </div>
  );
}
