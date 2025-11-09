'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Settings,
  Leaf,
  Trophy,
  Heart,
  TreePine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';

/** ------- Shared keys / constants ------- */
const PROFILE_KEY = 'ew_profile_v1';
const AVATAR_KEY = 'ew_avatar_v1';

const LB_DATA_KEY = 'EW_LEADERBOARD_DATA_V1';
const LB_POINTS_KEY = 'EW_TODAYS_POINTS_V1'; // my monthly score
const MONTHLY_POINTS_KEY = 'EW_MONTHLY_POINTS_V1';
const TOTAL_POINTS_KEY = 'EW_TOTAL_POINTS_V1';
const LIFETIME_BASELINE_KEY = 'EW_LIFETIME_BASELINE_V1';

type Profile = {
  name: string;
  email: string;
  location?: string;
  bio?: string;
  hobbies: string[];
};

type DBProfileRow = {
  full_name?: string | null;
  email?: string | null;
  hobbies?: string[] | null;
  avatar_id?: string | null;
};

type LBRow = { id: number; name: string; score: number };

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: Calendar },
  { href: '/coach', label: 'Coach', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/leaderboard', label: 'Monthly Leaderboard', icon: Trophy },
];

const fmt = (n: number) => n.toLocaleString();

function tierForRank(rankIndex: number | null) {
  if (rankIndex === null) return '—';
  if (rankIndex === 0) return 'Gold';
  if (rankIndex === 1) return 'Silver';
  if (rankIndex === 2) return 'Bronze';
  return `#${rankIndex + 1}`;
}

function ensureLifetimeBaseline(): number {
  try {
    const raw = localStorage.getItem(LIFETIME_BASELINE_KEY);
    const parsed = raw ? parseInt(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const baseline = 3000 + Math.floor(Math.random() * 6000);
    localStorage.setItem(LIFETIME_BASELINE_KEY, String(baseline));
    return baseline;
  } catch {
    return 3000;
  }
}

function initialsFromName(name: string) {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join('') || 'U';
}

function loadProfileFromLocal(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: 'You', email: '', hobbies: [] };
    const parsed = JSON.parse(raw);
    const hobbies = Array.isArray(parsed.hobbies)
      ? parsed.hobbies
      : typeof parsed.hobbies === 'string'
        ? parsed.hobbies.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
    return {
      name: parsed.name ?? 'You',
      email: parsed.email ?? '',
      location: parsed.location ?? '',
      bio: parsed.bio ?? '',
      hobbies,
    };
  } catch {
    return { name: 'You', email: '', hobbies: [] };
  }
}

export default function Sidebar() {
  const pathname = usePathname();

  // Profile & avatar
  const [profile, setProfile] = useState<Profile>(() => loadProfileFromLocal());
  const [avatarId, setAvatarId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AVATAR_KEY);
    } catch {
      return null;
    }
  });

  // Points & rank
  const [monthlyPoints, setMonthlyPoints] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [rankIndex, setRankIndex] = useState<number | null>(null);

  /** ---------- Live sync: local -> UI (same tab) & DB -> UI ---------- */
  useEffect(() => {
    ensureLifetimeBaseline();
    
    // Load from database first
    loadFromDatabase();

    // Then set up listeners for updates
    refreshStats();

    // 1) Local (instant) changes: listen for our custom "profileUpdate" event
    const onProfileUpdate = (e: Event) => {
      // Allow both detail payloads & local read fallback
      const det = (e as CustomEvent)?.detail as Partial<Profile & { avatarId?: string }> | undefined;
      if (det) {
        setProfile(prev => ({
          name: det.name ?? prev.name,
          email: det.email ?? prev.email,
          location: det.location ?? prev.location,
          bio: det.bio ?? prev.bio,
          hobbies: Array.isArray(det.hobbies) ? det.hobbies : prev.hobbies,
        }));
        if (typeof det.avatarId === 'string') setAvatarId(det.avatarId);
      } else {
        setProfile(loadProfileFromLocal());
        try {
          const a = localStorage.getItem(AVATAR_KEY);
          if (a !== null) setAvatarId(a);
        } catch {}
      }
    };

    // 2) Cross-tab changes: storage events
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_KEY) setProfile(loadProfileFromLocal());
      if (e.key === AVATAR_KEY) setAvatarId(localStorage.getItem(AVATAR_KEY));
      if ([MONTHLY_POINTS_KEY, TOTAL_POINTS_KEY, LB_DATA_KEY, LB_POINTS_KEY].includes(e.key ?? '')) {
        refreshStats();
      }
    };

    // 3) When returning to the tab, re-pull from DB in case another device updated
    const onFocus = () => {
      setProfile(loadProfileFromLocal());
      try {
        const a = localStorage.getItem(AVATAR_KEY);
        if (a !== null) setAvatarId(a);
      } catch {}
      refreshFromDB(); // light DB refresh
      refreshStats();
    };

    window.addEventListener('profileUpdate', onProfileUpdate as EventListener);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);

    // Initial DB pull
    refreshFromDB();

    return () => {
      window.removeEventListener('profileUpdate', onProfileUpdate as EventListener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFromDatabase() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, hobbies, profile_icon, total_points, month_points')
        .eq('id', uid)
        .single();

      if (error || !data) return;

      // Update profile
      setProfile({
        name: data.full_name || 'You',
        email: data.email || '',
        hobbies: Array.isArray(data.hobbies) ? data.hobbies : [],
        location: '',
        bio: '',
      });

      // Update avatar
      if (data.profile_icon) {
        setAvatarId(data.profile_icon);
      }

      // Update points from database
      setTotalPoints(data.total_points || 0);
      setMonthlyPoints(data.month_points || 0);

      // Calculate rank based on monthly points
      try {
        const lbRaw = localStorage.getItem(LB_DATA_KEY);
        const board = lbRaw ? (JSON.parse(lbRaw) as LBRow[]) : [];
        const combined = [...board, { id: 0, name: 'You', score: data.month_points || 0 }];
        combined.sort((a, b) => b.score - a.score);
        const rank = combined.findIndex(r => r.id === 0);
        setRankIndex(rank >= 0 ? rank : null);
      } catch {
        setRankIndex(null);
      }
    } catch {
      /* ignore */
    }
  }

  async function refreshFromDB() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, hobbies, avatar_id')
        .eq('id', uid)
        .maybeSingle<DBProfileRow>();

      if (error || !data) return;

      setProfile(prev => ({
        name: data.full_name ?? prev.name,
        email: data.email ?? prev.email,
        hobbies: Array.isArray(data.hobbies) ? data.hobbies : prev.hobbies,
        location: prev.location,
        bio: prev.bio,
      }));

      if (typeof data.avatar_id === 'string' && data.avatar_id.length) {
        setAvatarId(data.avatar_id);
      }
    } catch {
      /* ignore */
    }
  }

  function refreshStats() {
    const mRaw = localStorage.getItem(MONTHLY_POINTS_KEY);
    const tRaw = localStorage.getItem(TOTAL_POINTS_KEY);
    const lbRaw = localStorage.getItem(LB_DATA_KEY);
    const meRaw = localStorage.getItem(LB_POINTS_KEY);

    const m = mRaw ? parseInt(mRaw) : 0;
    let t = tRaw ? parseInt(tRaw) : NaN;
    if (!Number.isFinite(t)) {
      const baseline = ensureLifetimeBaseline();
      t = baseline + (Number.isFinite(m) ? m : 0);
      try {
        localStorage.setItem(TOTAL_POINTS_KEY, String(t));
        // emulate same-tab change for other listeners
        window.dispatchEvent(new StorageEvent('storage', { key: TOTAL_POINTS_KEY, newValue: String(t) }));
      } catch {}
    }

    setMonthlyPoints(Number.isFinite(m) ? m : 0);
    setTotalPoints(Number.isFinite(t) ? t : 0);

    let rank: number | null = null;
    try {
      const board = lbRaw ? (JSON.parse(lbRaw) as LBRow[]) : [];
      const me = meRaw ? parseInt(meRaw) : 0;
      const combined = [...board, { id: 0, name: 'You', score: Number.isFinite(me) ? me : 0 }];
      combined.sort((a, b) => b.score - a.score);
      rank = combined.findIndex(r => r.id === 0);
    } catch {
      rank = null;
    }
    setRankIndex(rank ?? null);
  }

  const rankLabel = useMemo(() => tierForRank(rankIndex), [rankIndex]);

  const displayName = profile.name?.trim() || 'You';
  const initials = initialsFromName(displayName);
  const avatarSrc = avatarId ? `/avatars/${avatarId}.png` : null;

  const hobbies = (profile.hobbies ?? []).slice(0, 6); // keep it compact

  return (
    <aside className="w-64 bg-white/40 backdrop-blur-md border-r border-slate-200/30 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-slate-200/30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Leaf className="w-8 h-8 text-green-600" />
          <span className="text-xl font-bold text-slate-900">EarthWise</span>
        </Link>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-slate-200/30">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-16 h-16">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt="User avatar" />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{displayName}</h3>
            <p className="text-sm text-slate-600">Level 1</p>
            <p className="text-xs text-slate-500 mt-1">Making positive changes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4 mt-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Total Points</span>
              <span className="text-sm font-semibold text-green-600">{fmt(totalPoints)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Monthly Points</span>
              <span className="text-sm font-semibold text-green-600">{fmt(monthlyPoints)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Rank</span>
              <span className="text-sm font-semibold text-slate-900">{rankLabel}</span>
            </div>
          </div>

          {/* Metrics (demo) */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  Overall Contentment
                </span>
                <span className="text-xs font-medium text-slate-700">85%</span>
              </div>
              <Progress value={85} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <TreePine className="w-3 h-3 text-green-500" />
                  Eco-friendly
                </span>
                <span className="text-xs font-medium text-slate-700">78%</span>
              </div>
              <Progress value={78} className="h-1.5" />
            </div>
          </div>

          {/* Hobbies */}
          <div>
            <h4 className="text-xs font-medium text-slate-700 mb-2">Hobbies</h4>
            <div className="flex flex-wrap gap-1">
              {hobbies.length ? (
                hobbies.map(hobby => (
                  <span key={hobby} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {hobby}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 bg-slate-100 text-slate-400 rounded-full text-xs">None set</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(item => {
            const Icon = item.icon as any;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg">
          <p className="text-xs font-medium text-slate-700 mb-1">Need guidance?</p>
          <p className="text-xs text-slate-600 mb-3">Chat with your AI coach for personalized tips.</p>
          <Link href="/coach">
            <button className="text-xs bg-white text-slate-700 px-3 py-1.5 rounded-md font-medium hover:bg-slate-50 transition-colors w-full">
              Start Chatting
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
