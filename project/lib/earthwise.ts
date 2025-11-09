// lib/earthwise.ts
// Central app helpers: storage keys, prefs, DOM flags, celebrate + sound

export const STORAGE_KEYS = {
    HEALTH: 'ew_healthTasks_v1',
    ECO: 'ew_ecoTasks_v1',
    LOG: 'ew_dailyLog_v1',
    LAST_OPEN: 'ew_lastOpenDate_v1',
    RECENT_HEALTH: 'ew_recentHealth_v1',
    RECENT_ECO: 'ew_recentEco_v1',
    MODE_HEALTH: 'ew_modeHealth_v1',
    MODE_ECO: 'ew_modeEco_v1',
  } as const;
  
  export const PROFILE_KEY = 'ew_profile_v1';
  export const PREFS_KEY = 'ew_prefs_v1';
  
  export type Prefs = {
    confetti: boolean;
    sounds: boolean;
    compact: boolean;
    reduceMotion: boolean;
  };
  
  const DEFAULT_PREFS: Prefs = {
    confetti: true,
    sounds: false,
    compact: false,
    reduceMotion: false,
  };
  
  export function readPrefs(): Prefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return DEFAULT_PREFS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...parsed };
    } catch {
      return DEFAULT_PREFS;
    }
  }
  
  export function writePrefs(next: Partial<Prefs>): Prefs {
    const merged = { ...readPrefs(), ...next };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
    applyPrefsToDOM(merged);
    dispatchPrefsEvent(merged);
    return merged;
  }
  
  export function applyPrefsToDOM(p: Prefs) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.compact = p.compact ? '1' : '0';
    root.dataset.reduceMotion = p.reduceMotion ? '1' : '0';
    root.dataset.confetti = p.confetti ? '1' : '0';
    root.dataset.sounds = p.sounds ? '1' : '0';
  }
  
  export function ensurePrefsAppliedOnLoad() {
    applyPrefsToDOM(readPrefs());
  }
  
  function dispatchPrefsEvent(p: Prefs) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('earthwise:prefs', { detail: p }));
  }
  
  /** ---- Celebration & Sound helpers ---- */
  
  let audioCtx: AudioContext | null = null;
  
  export function playClickIfEnabled() {
    const prefs = readPrefs();
    if (!prefs.sounds) return;
  
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 720;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
  
      const t = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.00001, t + 0.12);
      osc.stop(t + 0.13);
    } catch {
      // ignore audio failures
    }
  }
  
  /** Dispatch a "celebrate" event; GlobalUX listens and renders confetti */
  export function celebrateIfEnabled() {
    const prefs = readPrefs();
    if (!prefs.confetti || prefs.reduceMotion) return;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('earthwise:celebrate', { detail: { at: Date.now() } }));
  }
  