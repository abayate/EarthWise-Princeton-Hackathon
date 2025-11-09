'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import PageShell from '@/components/PageShell';

/* Mount helper */
function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

/* Keys */
const LB_POINTS_KEY = 'EW_TODAYS_POINTS_V1';  // carries Monthly Points now
const LB_DATA_KEY   = 'EW_LEADERBOARD_DATA_V1';

/* Geolocation subtitle bits */
type Place = { city: string; state: string };
const DEFAULT_PLACE: Place = { city: 'Princeton', state: 'NJ' };
const INITIAL_SUBTITLE = 'Top players making a positive impact…';

function toUSPS(name?: string): string | null {
  if (!name) return null;
  const m: Record<string, string> = {
    Alabama:'AL', Alaska:'AK', Arizona:'AZ', Arkansas:'AR', California:'CA',
    Colorado:'CO', Connecticut:'CT', Delaware:'DE', Florida:'FL', Georgia:'GA',
    Hawaii:'HI', Idaho:'ID', Illinois:'IL', Indiana:'IN', Iowa:'IA', Kansas:'KS',
    Kentucky:'KY', Louisiana:'LA', Maine:'ME', Maryland:'MD', Massachusetts:'MA',
    Michigan:'MI', Minnesota:'MN', Mississippi:'MS', Missouri:'MO', Montana:'MT',
    Nebraska:'NE', Nevada:'NV', 'New Hampshire':'NH', 'New Jersey':'NJ',
    'New Mexico':'NM', 'New York':'NY', 'North Carolina':'NC', 'North Dakota':'ND',
    Ohio:'OH', Oklahoma:'OK', Oregon:'OR', Pennsylvania:'PA', 'Rhode Island':'RI',
    'South Carolina':'SC', 'South Dakota':'SD', Tennessee:'TN', Texas:'TX',
    Utah:'UT', Vermont:'VT', Virginia:'VA', Washington:'WA', 'West Virginia':'WV',
    Wisconsin:'WI', Wyoming:'WY', 'District of Columbia':'DC'
  };
  return m[name] || null;
}

async function reverseGeocode(lat: number, lon: number): Promise<Place | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address ?? {};
    const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county;
    const state = toUSPS(a.state) || a.region || a.state_district || a.province || a.state;
    if (city && state) return { city, state };
    return null;
  } catch {
    return null;
  }
}

async function ipFallback(): Promise<Place | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    const city = data?.city;
    const state = data?.region_code || data?.region;
    if (city && state) return { city, state };
    return null;
  } catch {
    return null;
  }
}

/* Typewriter hook */
function useTypewriter(text: string, speed = 18) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplay('');
    const id = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return display;
}

/* Leaderboard data (mock peers) */
type LBUser = { id: number; name: string; score: number; avatar: string };
const leaderboardData: LBUser[] = [
  { id: 1, name: "Alex Chen",    score: 2150, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
  { id: 2, name: "Sarah Miller", score: 1950, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
  { id: 3, name: "James Wilson", score: 1840, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James" },
  { id: 4, name: "Emma Davis",   score: 1720, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
  { id: 5, name: "Michael Brown",score: 1680, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" },
  { id: 6, name: "Lisa Taylor",  score: 1590, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa" },
  { id: 7, name: "David Park",   score: 1520, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David" },
  { id: 8, name: "Rachel Green", score: 1480, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel" },
  { id: 9, name: "Thomas Lee",   score: 1440, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas" },
  { id: 10, name: "Jessica Kim", score: 1390, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica" }
];

export default function LeaderboardPage() {
  const [fullSubtitle, setFullSubtitle] = useState(INITIAL_SUBTITLE);
  const typedSubtitle = useTypewriter(fullSubtitle, 16);

  // Publish the static leaderboard so dashboard/sidebar can read it
  useEffect(() => {
    try {
      const compact = leaderboardData.map(({ id, name, score }) => ({ id, name, score }));
      localStorage.setItem(LB_DATA_KEY, JSON.stringify(compact));
      // also fire same-tab storage-like event
      window.dispatchEvent(new StorageEvent('storage', { key: LB_DATA_KEY, newValue: JSON.stringify(compact) }));
    } catch {}
  }, []);

  // My score is MONTHLY points only
  const [myScore, setMyScore] = useState<number>(0);

  // Keep “me” live via both real storage events and a custom event
  useEffect(() => {
    const raw = localStorage.getItem(LB_POINTS_KEY);
    if (raw) {
      const v = parseInt(raw);
      if (!Number.isNaN(v)) setMyScore(v);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === LB_POINTS_KEY && e.newValue) {
        const v = parseInt(e.newValue);
        if (!Number.isNaN(v)) setMyScore(v);
      }
    };
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ points?: number }>;
      if (typeof ce.detail?.points === 'number') setMyScore(ce.detail.points);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('leaderboardUpdate', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('leaderboardUpdate', onCustom as EventListener);
    };
  }, []);

  // Insert "You" and compute ranks (monthly-based)
  const combined = useMemo(() => {
    const me: LBUser = {
      id: 0,
      name: 'You',
      score: myScore,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You'
    };
    const arr = [...leaderboardData, me];
    arr.sort((a, b) => b.score - a.score);
    return arr;
  }, [myScore]);

  const myIndex = useMemo(() => combined.findIndex((u) => u.id === 0), [combined]);
  const ahead = myIndex > 0 ? combined[myIndex - 1] : null;
  const gap = ahead ? Math.max(0, ahead.score - myScore + 1) : 0;

  // subtitle: try location
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 6000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timer); resolve(p); },
          () => { clearTimeout(timer); resolve(null); },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 }
        );
      });

      let place: Place | null = null;
      if (pos) {
        place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      }
      if (!place) {
        place = await ipFallback();
      }

      const finalPlace = place ?? DEFAULT_PLACE;
      const next = `Top players making a positive impact near you | ${finalPlace.city}, ${finalPlace.state}`;
      if (!cancelled) setFullSubtitle(next);
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  const mounted = useIsMounted();

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Monthly Leaderboard" subtitle={typedSubtitle} />
        <PageShell className="max-w-6xl mx-auto py-8 px-4">
          {/* Your position */}
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {!mounted ? (
              <span className="font-medium">Loading your rank…</span>
            ) : myIndex === 0 ? (
              <span className="font-medium">You’re #1 on the board — keep it up!</span>
            ) : (
              <span className="font-medium">
                You’re #{myIndex + 1}. You need {gap} pts to pass {ahead?.name} (#{myIndex}).
              </span>
            )}
          </div>

          {/* Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {combined.slice(0, 3).map((user, i) => (
              <motion.div
                key={`${user.id}-${user.name}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white/90 rounded-2xl shadow-sm border p-6 ${
                  user.id === 0 ? 'border-emerald-300' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="relative w-16 h-16">
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      fill
                      className="rounded-full object-cover border-4 border-slate-100"
                    />
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                    {i === 0 ? (
                      <Trophy className="w-8 h-8 text-yellow-500" />
                    ) : i === 1 ? (
                      <Medal className="w-8 h-8 text-slate-400" />
                    ) : (
                      <Medal className="w-8 h-8 text-orange-400" />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {user.name} {user.id === 0 && <span className="text-emerald-600">(you)</span>}
                </h3>
                <p className="text-3xl font-bold text-slate-900 mt-2">{user.score}</p>
                <p className="text-sm text-slate-500 mt-1">points</p>
              </motion.div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">RANK</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">PLAYER</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {combined.map((user, i) => (
                  <tr
                    key={`${user.id}-${user.name}`}
                    className={`border-b border-slate-50 last:border-0 transition-colors ${
                      user.id === 0 ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium
                          ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                            i === 1 ? 'bg-slate-100 text-slate-700' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-50 text-slate-600'}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <span className="font-medium text-slate-900">
                          {user.name} {user.id === 0 && <span className="text-emerald-600">(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-slate-900">{user.score}</span>
                      <span className="text-sm text-slate-500 ml-1">pts</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageShell>
      </div>
    </div>
  );
}
