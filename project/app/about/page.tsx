'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import PageShell from '@/components/PageShell';
import ProfilePictureSelector from '@/components/ProfilePictureSelector';
import {
  Download, Upload, RefreshCw, Trash2, Database,
  Shield, Sparkles, Volume2, Minimize2, Wind, BookOpen, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/** Storage keys used across Dashboard/Tasks */
const STORAGE_KEYS = {
  HEALTH: 'ew_healthTasks_v1',
  ECO: 'ew_ecoTasks_v1',
  LOG: 'ew_dailyLog_v1',
  LAST_OPEN: 'ew_lastOpenDate_v1',
  RECENT_HEALTH: 'ew_recentHealth_v1',
  RECENT_ECO: 'ew_recentEco_v1',
  MODE_HEALTH: 'ew_modeHealth_v1',
  MODE_ECO: 'ew_modeEco_v1',
} as const;

/** Settings-only keys */
const PROFILE_KEY = 'ew_profile_v1';
const PREFS_KEY = 'ew_prefs_v1';

type Task = {
  id: string;
  label: string;
  points: number;
  completed: boolean;
};
type DailyLog = Record<string, boolean>;

type Profile = {
  name: string;
  email: string;
  location: string;
  bio: string;
  hobbies: string[]; // array of strings
};

type Prefs = {
  confetti: boolean;
  sounds: boolean;
  compact: boolean;
  reduceMotion: boolean;
};

type DBProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  location?: string | null;
  bio?: string | null;
  hobbies?: string[] | null;
  prefs?: Prefs | null;
};

function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SettingsPage() {
  // Hard-lock to light mode (no dark/system)
  const dark = false;

  /** -------- Profile state -------- */
  const [profile, setProfile] = useState<Profile>({
    name: 'Alex Johnson',
    email: 'alex@example.com',
    location: 'San Francisco, USA',
    bio: '',
    hobbies: [],
  });
  const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null);

  /** Local input for adding hobbies */
  const [hobbyInput, setHobbyInput] = useState('');

  /** -------- Preferences state -------- */
  const [prefs, setPrefs] = useState<Prefs>({
    confetti: true,
    sounds: false,
    compact: false,
    reduceMotion: false,
  });
  const [prefsSavedAt, setPrefsSavedAt] = useState<number | null>(null);

  /** -------- Backup & Restore state -------- */
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | 'profile' | 'prefs'>(null);

  /** -------- Load persisted settings on mount + Supabase merge -------- */
  useEffect(() => {
    (async () => {
      // 1) Load local first (instant)
      try {
        const pRaw = localStorage.getItem(PROFILE_KEY);
        if (pRaw) {
          // migrate if hobbies was saved as a string
          const parsed = JSON.parse(pRaw) as Omit<Profile, 'hobbies'> & { hobbies?: string | string[] };
          const migrated: Profile = {
            name: parsed.name ?? '',
            email: (parsed as any).email ?? '',
            location: (parsed as any).location ?? '',
            bio: (parsed as any).bio ?? '',
            hobbies: Array.isArray(parsed.hobbies)
              ? parsed.hobbies
              : typeof parsed.hobbies === 'string'
                ? parsed.hobbies.split(',').map(s => s.trim()).filter(Boolean)
                : [],
          };
          setProfile(migrated);
        }
      } catch { /* ignore */ }

      try {
        const prRaw = localStorage.getItem(PREFS_KEY);
        if (prRaw) {
          const parsed = JSON.parse(prRaw) as Prefs;
          setPrefs(prev => ({ ...prev, ...parsed }));
          applyPrefs(parsed);
        } else {
          applyPrefs(prefs);
        }
      } catch {
        applyPrefs(prefs);
      }

      // 2) Merge from Supabase (authoritative if present)
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;

        const { data: row, error } = await supabase
          .from('profiles')
          .select('full_name, email, location, bio, hobbies, prefs')
          .eq('id', uid)
          .maybeSingle<DBProfileRow>();

        if (error) {
          // Non-fatal: stay on local values
          console.warn('Load from Supabase failed:', error.message);
          return;
        }
        if (!row) return;

        // Merge profile
        setProfile(prev => ({
          name: row.full_name ?? prev.name ?? '',
          email: row.email ?? prev.email ?? '',
          location: row.location ?? prev.location ?? '',
          bio: row.bio ?? prev.bio ?? '',
          hobbies: Array.isArray(row.hobbies) ? row.hobbies : prev.hobbies,
        }));

        // Merge prefs
        if (row.prefs) {
          setPrefs(prev => ({ ...prev, ...row.prefs! }));
          applyPrefs(row.prefs!);
        }
      } catch (err) {
        console.warn('Supabase load error:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Apply preferences as data attributes for app-wide CSS hooks (optional) */
  function applyPrefs(next: Partial<Prefs>) {
    const root = document.documentElement;
    const merged: Prefs = { ...prefs, ...next };
    root.dataset.compact = merged.compact ? '1' : '0';
    root.dataset.reduceMotion = merged.reduceMotion ? '1' : '0';
    root.dataset.confetti = merged.confetti ? '1' : '0';
    root.dataset.sounds = merged.sounds ? '1' : '0';

    // notify listeners (same-tab)
    try {
      window.dispatchEvent(new CustomEvent('prefsUpdate', { detail: merged }));
    } catch {}
  }

  /** Save Profile -> localStorage + Supabase */
  async function handleSaveProfile() {
    setSaving('profile');
    try {
      // Save local
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setProfileSavedAt(Date.now());

      // Save remote
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const payload: Partial<DBProfileRow> = {
          id: uid,
          full_name: profile.name ?? '',
          email: profile.email ?? '',
          location: profile.location ?? '',
          bio: profile.bio ?? '',
          hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
        };
        const { error } = await supabase
          .from('profiles')
          .upsert(
            { ...payload, id: uid, /* updated_at on DB with trigger or here */ },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Supabase profile save failed:', error.message);
          setMessage(`Profile saved locally. Supabase error: ${error.message}`);
        } else {
          setMessage('Profile saved and synced.');
        }
      } else {
        setMessage('Profile saved (not signed in).');
      }
    } catch (e: any) {
      console.error(e);
      setMessage('Failed to save profile.');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 1800);
    }
  }

  /** Save Prefs -> localStorage + Supabase */
  async function handleSavePrefs(next?: Partial<Prefs>) {
    setSaving('prefs');
    try {
      const merged = { ...prefs, ...(next ?? {}) };
      setPrefs(merged);
      localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
      applyPrefs(merged);
      setPrefsSavedAt(Date.now());

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            { id: uid, prefs: merged },
            { onConflict: 'id' }
          );
        if (error) {
          console.error('Supabase prefs save failed:', error.message);
          setMessage(`Preferences updated locally. Supabase error: ${error.message}`);
        } else {
          setMessage('Preferences updated and synced.');
        }
      } else {
        setMessage('Preferences updated (not signed in).');
      }
    } catch (e: any) {
      console.error(e);
      setMessage('Failed to update preferences.');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 1800);
    }
  }

  /** ------- Data helpers ------- */
  function getAllAppData() {
    const keys = [
      STORAGE_KEYS.HEALTH,
      STORAGE_KEYS.ECO,
      STORAGE_KEYS.LOG,
      STORAGE_KEYS.LAST_OPEN,
      STORAGE_KEYS.RECENT_HEALTH,
      STORAGE_KEYS.RECENT_ECO,
      STORAGE_KEYS.MODE_HEALTH,
      STORAGE_KEYS.MODE_ECO,
      PROFILE_KEY,
      PREFS_KEY,
    ] as const;

    const dump: Record<string, unknown> = {};
    keys.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        try {
          dump[k] = JSON.parse(raw);
        } catch {
          dump[k] = raw;
        }
      }
    });
    return dump;
  }

  function downloadJSON(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  function handleExport() {
    const payload = getAllAppData();
    downloadJSON(`earthwise-backup-${dateKey()}.json`, payload);
    setMessage('Backup exported.');
    setTimeout(() => setMessage(null), 1500);
  }

  /** After a restore, also push to Supabase if signed in */
  async function restoreFromObject(obj: Record<string, unknown>) {
    // Write back known keys only (ignore extras)
    const allowed = new Set(Object.values(STORAGE_KEYS).concat([PROFILE_KEY, PREFS_KEY]));
    Object.entries(obj).forEach(([k, v]) => {
      if (!allowed.has(k)) return;
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        // best-effort
      }
    });

    // Dispatch updates so Dashboard/Tasks sync in the same tab
    const h = localStorage.getItem(STORAGE_KEYS.HEALTH);
    const e = localStorage.getItem(STORAGE_KEYS.ECO);
    if (h) {
      window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.HEALTH, value: h } }));
    }
    if (e) {
      window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.ECO, value: e } }));
    }

    // Refresh local settings state (with migration) and sync to Supabase
    try {
      const pRaw = localStorage.getItem(PROFILE_KEY);
      let newProfile = profile;
      if (pRaw) {
        const parsed = JSON.parse(pRaw) as any;
        const migrated: Profile = {
          name: parsed?.name ?? '',
          email: parsed?.email ?? '',
          location: parsed?.location ?? '',
          bio: parsed?.bio ?? '',
          hobbies: Array.isArray(parsed?.hobbies)
            ? parsed.hobbies
            : typeof parsed?.hobbies === 'string'
              ? parsed.hobbies.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [],
        };
        setProfile(migrated);
        newProfile = migrated;
      }

      const prRaw = localStorage.getItem(PREFS_KEY);
      let newPrefs = prefs;
      if (prRaw) {
        const parsed = JSON.parse(prRaw) as Prefs;
        setPrefs(parsed);
        applyPrefs(parsed);
        newPrefs = parsed;
      }

      // Push restored profile/prefs to Supabase if signed in
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: uid,
              full_name: newProfile.name ?? '',
              email: newProfile.email ?? '',
              location: newProfile.location ?? '',
              bio: newProfile.bio ?? '',
              hobbies: Array.isArray(newProfile.hobbies) ? newProfile.hobbies : [],
              prefs: newPrefs,
            },
            { onConflict: 'id' }
          );
        if (error) {
          console.error('Supabase restore sync failed:', error.message);
          setMessage(`Backup imported locally. Supabase error: ${error.message}`);
        } else {
          setMessage('Backup imported and synced.');
        }
      } else {
        setMessage('Backup imported (not signed in).');
      }
    } catch (e: any) {
      console.error('Restore error:', e?.message ?? e);
      setMessage('Backup imported locally. Sign in to sync to cloud.');
    } finally {
      setTimeout(() => setMessage(null), 1500);
    }
  }

  async function handleImportFromText() {
    try {
      const obj = JSON.parse(importText);
      if (!obj || typeof obj !== 'object') throw new Error('Invalid JSON.');
      await restoreFromObject(obj as Record<string, unknown>);
    } catch (e: any) {
      setMessage(`Import failed: ${e?.message ?? 'Invalid JSON'}`);
      setTimeout(() => setMessage(null), 1500);
    }
  }

  function handleImportFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        if (!obj || typeof obj !== 'object') throw new Error('Invalid JSON.');
        await restoreFromObject(obj as Record<string, unknown>);
      } catch (e: any) {
        setMessage(`Import failed: ${e?.message ?? 'Invalid JSON'}`);
        setTimeout(() => setMessage(null), 1500);
      }
    };
    reader.onerror = () => {
      setMessage('Import failed: could not read file.');
      setTimeout(() => setMessage(null), 1500);
    };
    reader.readAsText(file);
  }

  /** ------- Danger Zone actions ------- */
  function confirmAction(msg: string) {
    return typeof window !== 'undefined' ? window.confirm(msg) : false;
  }

  // Set all "completed" flags to false (keeps the lists & points definitions)
  function resetTodaysCompletions() {
    if (!confirmAction('Reset all task completions for today?')) return;

    const resetList = (raw: string | null) => {
      if (!raw) return null;
      try {
        const arr = JSON.parse(raw) as Task[];
        return JSON.stringify(arr.map(t => ({ ...t, completed: false })));
      } catch { return null; }
    };

    const newH = resetList(localStorage.getItem(STORAGE_KEYS.HEALTH));
    const newE = resetList(localStorage.getItem(STORAGE_KEYS.ECO));

    if (newH) {
      localStorage.setItem(STORAGE_KEYS.HEALTH, newH);
      window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.HEALTH, value: newH } }));
    }
    if (newE) {
      localStorage.setItem(STORAGE_KEYS.ECO, newE);
      window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.ECO, value: newE } }));
    }
    setMessage('Completions reset.');
    setTimeout(() => setMessage(null), 1500);
  }

  // Clear daily log (streak resets)
  function resetStreak() {
    if (!confirmAction('Clear your daily log/streak?')) return;
    localStorage.removeItem(STORAGE_KEYS.LOG);
    localStorage.setItem(STORAGE_KEYS.LOG, JSON.stringify({}));
    setTimeout(() => localStorage.removeItem(STORAGE_KEYS.LOG), 0);
    setMessage('Streak/log cleared.');
    setTimeout(() => setMessage(null), 1500);
  }

  // Reset the task lists but keep data outside tasks (e.g., profile, prefs)
  function resetTaskLists() {
    if (!confirmAction('Restore task lists to default and clear recent lists?')) return;
    [STORAGE_KEYS.HEALTH, STORAGE_KEYS.ECO, STORAGE_KEYS.RECENT_HEALTH, STORAGE_KEYS.RECENT_ECO, STORAGE_KEYS.MODE_HEALTH, STORAGE_KEYS.MODE_ECO].forEach(k => {
      localStorage.removeItem(k);
    });
    window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.HEALTH, value: '[]' } }));
    window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.ECO, value: '[]' } }));
    setMessage('Tasks reset to defaults.');
    setTimeout(() => setMessage(null), 1500);
  }

  // Full reset: wipe all app keys (including profile/prefs)
  function fullReset() {
    if (!confirmAction('This will erase all EarthWise data in this browser. Continue?')) return;
    const keys = Object.values(STORAGE_KEYS).concat([PROFILE_KEY, PREFS_KEY]);
    keys.forEach(k => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.HEALTH, value: '[]' } }));
    window.dispatchEvent(new CustomEvent('taskStateUpdate', { detail: { key: STORAGE_KEYS.ECO, value: '[]' } }));
    setProfile({ name: '', email: '', location: '', bio: '', hobbies: [] });
    setPrefs({ confetti: true, sounds: false, compact: false, reduceMotion: false });
    applyPrefs({ confetti: true, sounds: false, compact: false, reduceMotion: false });
    setMessage('All data cleared.');
    setTimeout(() => setMessage(null), 1500);
  }

  // Light-only styling branches
  const containerBg = 'bg-white border-slate-200';
  const heading = 'text-slate-900';
  const sub = 'text-slate-600';
  const inputTheme = '';

  const lastSavedProfile = useMemo(() => profileSavedAt ? new Date(profileSavedAt).toLocaleTimeString() : null, [profileSavedAt]);
  const lastSavedPrefs = useMemo(() => prefsSavedAt ? new Date(prefsSavedAt).toLocaleTimeString() : null, [prefsSavedAt]);

  /** Hobbies handlers */
  function commitHobby(raw: string) {
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    // only add exactly what was typed (no comma splitting)
    setProfile(p => {
      const set = new Set(p.hobbies.map(h => h.toLowerCase()));
      if (set.has(cleaned.toLowerCase())) return p;
      return { ...p, hobbies: [...p.hobbies, cleaned] };
    });
    setHobbyInput('');
  }
  function removeHobby(index: number) {
    setProfile(p => ({ ...p, hobbies: p.hobbies.filter((_, i) => i !== index) }));
  }
  function onHobbyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitHobby(hobbyInput);
    } else if (e.key === 'Backspace' && hobbyInput === '' && profile.hobbies.length) {
      // backspace to remove last chip when input is empty
      removeHobby(profile.hobbies.length - 1);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Settings" subtitle="Adjust preferences for your EarthWise experience" />

        <PageShell className="p-6">
          {message ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile */}
            <section className={`rounded-xl border p-6 ${containerBg}`}>
              <h2 className={`text-lg font-semibold ${heading}`}>Profile</h2>
              <p className={`text-sm mb-4 ${sub}`}>Update your basic information</p>

              {/* Profile Picture Selector */}
              <div className="mb-6">
                <ProfilePictureSelector dark={false} />
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    className="mt-2"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    aria-label="Full name input"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="mt-2"
                    value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    aria-label="Email input"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    className="mt-2"
                    value={profile.location}
                    onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                    aria-label="Location input"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    rows={5}
                    placeholder="A short personal bio..."
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                    value={profile.bio}
                    onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                    aria-label="Bio textarea"
                  />
                </div>

                {/* Hobbies as chips with close button */}
                <div>
                  <Label htmlFor="hobbyInput">Hobbies</Label>

                  {/* Chip list */}
                  {profile.hobbies.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.hobbies.map((h, i) => (
                        <span
                          key={`${h}-${i}`}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                          aria-label={`Hobby: ${h}`}
                        >
                          <span className="mr-1">{h}</span>
                          <button
                            type="button"
                            className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-slate-200"
                            aria-label={`Remove hobby ${h}`}
                            onClick={() => removeHobby(i)}
                          >
                            <X className="h-3.5 w-3.5 opacity-70" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Entry input */}
                  <div className="mt-2">
                    <Input
                      id="hobbyInput"
                      placeholder="Type a hobby and press Enter…"
                      className=""
                      value={hobbyInput}
                      onChange={(e) => setHobbyInput(e.target.value)}
                      onKeyDown={onHobbyKeyDown}
                      // NOTE: no onBlur commit; only saves on Enter
                      aria-label="Add hobby"
                    />
                    <p className={`mt-1 text-xs ${sub}`}>
                      Press <span className="font-medium">Enter</span> to add.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Button onClick={handleSaveProfile} disabled={saving === 'profile'} className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {saving === 'profile' ? 'Saving…' : 'Save Profile'}
                </Button>
                {lastSavedProfile ? (
                  <span className={`text-xs ${sub}`}>Last saved {lastSavedProfile}</span>
                ) : null}
              </div>
            </section>

            {/* Appearance & Preferences */}
            <section className={`rounded-xl border p-6 ${containerBg}`}>
              <h2 className={`text-lg font-semibold ${heading}`}>Preferences</h2>
              <p className={`text-sm mb-4 ${sub}`}>Interaction options</p>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleRow
                  label="Confetti on complete"
                  description="Celebrate completing a task."
                  checked={prefs.confetti}
                  onCheckedChange={(v) => handleSavePrefs({ confetti: v })}
                  icon={<Sparkles className="h-4 w-4" />}
                  dark={false}
                />
                <ToggleRow
                  label="Sounds"
                  description="Play a short sound when you complete a task."
                  checked={prefs.sounds}
                  onCheckedChange={(v) => handleSavePrefs({ sounds: v })}
                  icon={<Volume2 className="h-4 w-4" />}
                  dark={false}
                />
                <ToggleRow
                  label="Compact layout"
                  description="Reduce spacing for dense information."
                  checked={prefs.compact}
                  onCheckedChange={(v) => handleSavePrefs({ compact: v })}
                  icon={<Minimize2 className="h-4 w-4" />}
                  dark={false}
                />
                <ToggleRow
                  label="Reduce motion"
                  description="Limit animations for accessibility."
                  checked={prefs.reduceMotion}
                  onCheckedChange={(v) => handleSavePrefs({ reduceMotion: v })}
                  icon={<Wind className="h-4 w-4" />}
                  dark={false}
                />
              </div>

              <div className="mt-4 text-xs">
                {lastSavedPrefs ? <span className={sub}>Preferences saved {lastSavedPrefs}</span> : null}
              </div>
            </section>

            {/* Backup & Restore */}
            <section className={`rounded-xl border p-6 ${containerBg}`}>
              <h2 className={`text-lg font-semibold ${heading}`}>Backup & Restore</h2>
              <p className={`text-sm mb-4 ${sub}`}>Export or import your EarthWise data</p>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleExport} className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export backup
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFromFile(f);
                    // reset so same file can be chosen twice in a row
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import from file
                </Button>
              </div>

              <Separator className="my-4" />

              <Label htmlFor="importText">Paste backup JSON</Label>
              <textarea
                id="importText"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                placeholder='{"ew_healthTasks_v1":[...],"ew_dailyLog_v1":{...}}'
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
              />
              <div className="mt-3">
                <Button type="button" variant="secondary" onClick={handleImportFromText} className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import from text
                </Button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className={`rounded-xl border p-6 ${containerBg}`}>
              <h2 className={`text-lg font-semibold ${heading}`}>Danger Zone</h2>
              <p className={`text-sm mb-4 ${sub}`}>These actions cannot be undone</p>

              <div className="space-y-3">
                <DangerRow
                  title="Reset today's completions"
                  description="Uncheck all tasks for today (keeps lists and points)."
                  actionLabel="Reset completions"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={resetTodaysCompletions}
                  dark={false}
                />
                <DangerRow
                  title="Reset streak / daily log"
                  description="Clears your logged completion history."
                  actionLabel="Clear streak"
                  icon={<Database className="h-4 w-4" />}
                  onClick={resetStreak}
                  dark={false}
                />
                <DangerRow
                  title="Reset task lists"
                  description="Restore Health & Eco lists and clear recent chips/mode."
                  actionLabel="Reset tasks"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={resetTaskLists}
                  dark={false}
                />
                <DangerRow
                  title="Full reset"
                  description="Erase ALL EarthWise data stored in this browser."
                  actionLabel="Erase everything"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={fullReset}
                  emphasis
                  dark={false}
                />
              </div>
            </section>
          </div>
        </PageShell>
      </div>
    </div>
  );
}

/** ---------- Small UI pieces ---------- */

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  icon,
  dark,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: React.ReactNode;
  dark: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${dark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="mr-3">
        <div className="flex items-center gap-2">
          {icon ? <span className={`${dark ? 'text-slate-300' : 'text-slate-600'}`}>{icon}</span> : null}
          <p className={`${dark ? 'text-white' : 'text-slate-900'} text-sm font-medium`}>{label}</p>
        </div>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function DangerRow({
  title,
  description,
  actionLabel,
  onClick,
  icon,
  emphasis,
  dark,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  icon?: React.ReactNode;
  emphasis?: boolean;
  dark: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${dark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div>
        <p className={`${dark ? 'text-white' : 'text-slate-900'} text-sm font-semibold`}>{title}</p>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
      </div>
      <Button
        variant={emphasis ? 'destructive' : 'outline'}
        onClick={onClick}
        className="inline-flex items-center gap-2"
      >
        {icon}
        {actionLabel}
      </Button>
    </div>
  );
}
