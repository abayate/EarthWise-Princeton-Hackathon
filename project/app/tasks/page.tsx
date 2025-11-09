
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import PageShell from '@/components/PageShell';
import DashboardCard from '@/components/DashboardCard';
import { Heart, Leaf, CalendarDays, RotateCcw } from 'lucide-react';
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

      const h = hRaw ? (JSON.parse(hRaw) as Task[]) : defaultHealth;
      const e = eRaw ? (JSON.parse(eRaw) as Task[]) : defaultEco;
      const log = logRaw ? (JSON.parse(logRaw) as DailyLog) : {};

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

  // Toggle & Reset (disabled in tomorrow preview)
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

  const displayedHealth = useMemo(
    () => (viewingTomorrow ? healthTasks.map(t => ({ ...t, completed: false })) : healthTasks),
    [healthTasks, viewingTomorrow]
  );
  const displayedEco = useMemo(
    () => (viewingTomorrow ? ecoTasks.map(t => ({ ...t, completed: false })) : ecoTasks),
    [ecoTasks, viewingTomorrow]
  );

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

  const subTitle = viewingTomorrow
    ? `Preview of tomorrow's tasks (${formatNice(tomorrow)})`
    : `View and manage today's Health & Eco tasks (${formatNice(today)})`;

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
            <div className="flex gap-2">
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
            <div className="mt-2 mb-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {healthCompleted}/{healthTasks.length} completed
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetSection('health')}
                disabled={viewingTomorrow || healthCompleted === 0}
                title={viewingTomorrow ? 'Available tomorrow' : 'Reset all Health tasks for today'}
                className="inline-flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <div id="health" className="space-y-3">
              {displayedHealth.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm text-slate-700">
                    {task.label}
                    <span className="ml-2 text-xs text-slate-500">(+{task.points})</span>
                  </span>
                  <Button
                    size="sm"
                    variant={task.completed ? 'default' : 'outline'}
                    onClick={() => toggleTask('health', task.id)}
                    disabled={viewingTomorrow}
                    title={viewingTomorrow ? 'Available tomorrow' : task.completed ? 'Undo' : 'Complete'}
                  >
                    {viewingTomorrow ? 'Locked' : task.completed ? 'Undo' : 'Complete'}
                  </Button>
                </div>
              ))}
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
            <div className="mt-2 mb-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {ecoCompleted}/{ecoTasks.length} completed
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetSection('eco')}
                disabled={viewingTomorrow || ecoCompleted === 0}
                title={viewingTomorrow ? 'Available tomorrow' : 'Reset all Eco tasks for today'}
                className="inline-flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <div id="eco" className="space-y-3">
              {displayedEco.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm text-slate-700">
                    {task.label}
                    <span className="ml-2 text-xs text-slate-500">(+{task.points})</span>
                  </span>
                  <Button
                    size="sm"
                    variant={task.completed ? 'default' : 'outline'}
                    onClick={() => toggleTask('eco', task.id)}
                    disabled={viewingTomorrow}
                    title={viewingTomorrow ? 'Available tomorrow' : task.completed ? 'Undo' : 'Complete'}
                  >
                    {viewingTomorrow ? 'Locked' : task.completed ? 'Undo' : 'Complete'}
                  </Button>
                </div>
              ))}
            </div>
          </DashboardCard>
        </PageShell>
      </div>
    </div>
  );
}
