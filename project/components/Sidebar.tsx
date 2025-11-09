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
  LogOut,
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
  profile_icon?: string | null;
  total_points?: number | null;
  month_points?: number | null;
  overall_contentment?: number | null;
  eco_friendly_score?: number | null;
  bio?: string | null; // newly surfaced in UI
};

type LBRow = { id: number; name: string; score: number };

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: Calendar },
  { href: '/coach', label: 'Coach', icon: MessageSquare },
  { href: '/insights', label: 'Insights', icon: Trophy },
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

  // Prevent hydration errors - only render after mount
  const [mounted, setMounted] = useState(false);

  // Profile & avatar
  const [profile, setProfile] = useState<Profile>({ name: 'You', email: '', hobbies: [] });
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // Points & rank
  const [monthlyPoints, setMonthlyPoints] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [rankIndex, setRankIndex] = useState<number | null>(null);
  const [overallContentment, setOverallContentment] = useState<number>(0);
  const [ecoFriendly, setEcoFriendly] = useState<number>(0);

  /** ---------- Load from database on mount ---------- */
  useEffect(() => {
    setMounted(true);
    loadFromDatabase();
  }, []);

  /** ---------- Live sync: local -> UI (same tab) & DB -> UI ---------- */
  useEffect(() => {
    if (!mounted) return;

    ensureLifetimeBaseline();

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
        // On generic profileUpdate with no payload, refresh from DB
        refreshFromDB();
      }
    };

    // 2) Cross-tab changes: storage events
    const onStorage = (e: StorageEvent) => {
      if ([LB_DATA_KEY].includes(e.key ?? '')) {
        refreshStats();
      }
    };

    // 3) When returning to the tab, re-pull from DB in case another device updated
    const onFocus = () => {
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
  }, [mounted]);

  async function loadFromDatabase() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, hobbies, profile_icon, total_points, month_points, overall_contentment, eco_friendly_score, bio')
        .eq('id', uid)
        .single<DBProfileRow>();

      if (error || !data) return;

      // Update profile
      setProfile({
        name: data.full_name || 'You',
        email: data.email || '',
        hobbies: Array.isArray(data.hobbies) ? data.hobbies : [],
        location: '',
        bio: data.bio || '',
      });

      // Update avatar
      if (data.profile_icon) {
        setAvatarId(data.profile_icon);
      }

      // Update points from database
      setTotalPoints(Number(data.total_points ?? 0));
      setMonthlyPoints(Number(data.month_points ?? 0));

      // Update metrics from DB (clamped 0-100)
      setOverallContentment(Math.max(0, Math.min(100, Number(data.overall_contentment ?? 0))));
      setEcoFriendly(Math.max(0, Math.min(100, Number(data.eco_friendly_score ?? 0))));

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
        .select('full_name, email, hobbies, profile_icon, total_points, month_points, overall_contentment, eco_friendly_score, bio')
        .eq('id', uid)
        .single<DBProfileRow>();

      if (error || !data) return;

      setProfile(prev => ({
        name: data.full_name ?? prev.name,
        email: data.email ?? prev.email,
        hobbies: Array.isArray(data.hobbies) ? data.hobbies : prev.hobbies,
        location: prev.location,
        bio: (data.bio ?? prev.bio) || prev.bio,
      }));

      if (data.profile_icon) {
        setAvatarId(data.profile_icon);
      }

      // Update points from database
      setTotalPoints(Number(data.total_points ?? 0));
      setMonthlyPoints(Number(data.month_points ?? 0));

      // Update metrics from DB (clamped 0-100)
      setOverallContentment(Math.max(0, Math.min(100, Number(data.overall_contentment ?? 0))));
      setEcoFriendly(Math.max(0, Math.min(100, Number(data.eco_friendly_score ?? 0))));

      // Recalculate rank
      refreshStats();
    } catch {
      /* ignore */
    }
  }

  function refreshStats() {
    // Don't use localStorage for points - only for rank calculation
    const lbRaw = localStorage.getItem(LB_DATA_KEY);
    
    let rank: number | null = null;
    try {
      const board = lbRaw ? (JSON.parse(lbRaw) as LBRow[]) : [];
      const combined = [...board, { id: 0, name: 'You', score: monthlyPoints }];
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

  // Show loading state until mounted to prevent hydration errors
  if (!mounted) {
    return (
      <aside className="w-64 bg-white/40 backdrop-blur-md border-r border-slate-200/30 h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border-slate-200/30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-green-600" />
            <span className="text-xl font-bold text-slate-900">EarthWise</span>
          </Link>
        </div>
        <div className="p-4">
          <div className="animate-pulse text-sm text-slate-500">Loading...</div>
        </div>
      </aside>
    );
  }

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
            <p className="text-xs text-slate-500 mt-1">
              {profile.bio?.trim()
                ? (profile.bio.length > 80 ? profile.bio.slice(0, 77) + '…' : profile.bio)
                : 'Making positive changes'}
            </p>
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

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          {/* Metrics from DB */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  Overall Contentment
                </span>
                <span className="text-xs font-medium text-slate-700">{overallContentment}%</span>
              </div>
              <Progress value={overallContentment} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <TreePine className="w-3 h-3 text-green-500" />
                  Eco-friendly
                </span>
                <span className="text-xs font-medium text-slate-700">{ecoFriendly}%</span>
              </div>
              <Progress value={ecoFriendly} className="h-1.5" />
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
