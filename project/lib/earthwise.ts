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
    if (typeof window === 'undefined') return;
    try {
      const prefs = readPrefs();
      if (!prefs.confetti || prefs.reduceMotion) return;
      window.dispatchEvent(new CustomEvent('earthwise:celebrate'));
    } catch {
      // swallow
    }
  }

/** ---- Environmental Impact Calculations ---- */

export type Impact = {
  points: number;
  kgCO2: number;
  trees: number;
  waterLiters: number;
};

export function pointsToImpact(points: number): Impact {
  // very simple model: 1 point ≈ 0.45 kg CO2 avoided
  const kgCO2 = points * 0.45;
  // EPA-ish rough figure: 1 tree ~ 21kg CO2 / year
  const trees = kgCO2 / 21;
  // fun stat: 1 point = 2.5 liters of water saved
  const waterLiters = points * 2.5;

  return {
    points,
    kgCO2: Number(kgCO2.toFixed(1)),
    trees: Number(trees.toFixed(2)),
    waterLiters: Number(waterLiters.toFixed(1)),
  };
}

// simple forecaster for Chestnut Forty track
export function forecastImpact(past7DaysPoints: number[]): Impact {
  const avg =
    past7DaysPoints.length > 0
      ? past7DaysPoints.reduce((a, b) => a + b, 0) / past7DaysPoints.length
      : 120; // fallback
  // forecast for next 7 days
  return pointsToImpact(avg * 7);
}