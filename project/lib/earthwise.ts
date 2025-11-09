// project/lib/earthwise.ts

// -------- Storage keys used across the app (Dashboard, Tasks, Settings) --------
export const STORAGE_KEYS = {
  HEALTH: 'EW_HEALTH_V1',
  ECO: 'EW_ECO_V1',
  LOG: 'EW_LOG_V1',
  LAST_OPEN: 'EW_LAST_OPEN_V1',
  MODE_HEALTH: 'EW_MODE_HEALTH_V1',
  MODE_ECO: 'EW_MODE_ECO_V1',
  RECENT_HEALTH: 'EW_RECENT_HEALTH_V1',
  RECENT_ECO: 'EW_RECENT_ECO_V1',
};

// -------- User preferences for sound/confetti (used by Settings & Dashboard) ---
export type Prefs = {
  sound: boolean;
  confetti: boolean;
  reduceMotion?: boolean;
};

export const PREFS_KEY = 'EW_PREFS_V1';
const DEFAULT_PREFS: Prefs = { sound: true, confetti: true, reduceMotion: false };

export function readPrefs(): Prefs {
  try {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(next: Partial<Prefs>): Prefs {
  try {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    const merged = { ...readPrefs(), ...next };
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return readPrefs();
  }
}

// -------- Apply prefs to HTML element on load (for GlobalUX) ------------------
export function ensurePrefsAppliedOnLoad(): void {
  try {
    if (typeof window === 'undefined') return;
    const prefs = readPrefs();
    const html = document.documentElement;
    
    // Apply reduce motion preference
    if (prefs.reduceMotion) {
      html.setAttribute('data-reduceMotion', '1');
    } else {
      html.removeAttribute('data-reduceMotion');
    }
  } catch {
    // no-op
  }
}

// -------- Small UX helpers used when toggling tasks ----------------------------
export function celebrateIfEnabled(): void {
  try {
    if (typeof window === 'undefined') return;
    const { confetti } = readPrefs();
    if (!confetti) return;

    // If canvas-confetti is available globally, use it; otherwise no-op
    const w = window as any;
    if (typeof w.confetti === 'function') {
      w.confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }
  } catch {
    // no-op
  }
}

export function playClickIfEnabled(): void {
  try {
    if (typeof window === 'undefined') return;
    const { sound } = readPrefs();
    if (!sound) return;
    const a = new Audio('/sounds/click.mp3');
    a.volume = 0.25;
    // Do not block UI if autoplay is disallowed
    void a.play().catch(() => {});
  } catch {
    // no-op
  }
}

// -------- Impact modeling (used on Dashboard) ---------------------------------
// Very simple model: 1 point ≈ 0.12 kg CO₂ avoided; trees & water are friendly analogues.
export function pointsToImpact(points: number) {
  const kgCO2 = +(points * 0.12).toFixed(1);
  const trees = Math.max(1, Math.round(points / 25));
  const waterLiters = Math.round(points * 2.5);
  return { kgCO2, trees, waterLiters };
}

export function forecastImpact(last7DaysPoints: number[]) {
  const total = (Array.isArray(last7DaysPoints) ? last7DaysPoints : []).reduce((a, b) => a + (b || 0), 0);
  const kgCO2 = +(total * 0.12).toFixed(1);
  const trees = Math.max(1, Math.round(total / 25));
  const waterLiters = Math.round(total * 2.5);
  return { kgCO2, trees, waterLiters };
}
