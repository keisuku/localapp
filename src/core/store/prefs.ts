import { create } from 'zustand';
import { getSetting, setSetting } from '@/core/db/db';

export type ThemePref = 'light' | 'dark' | 'system';
export type DensityPref = 'comfort' | 'compact';

interface PrefsState {
  theme: ThemePref;
  density: DensityPref;
  setTheme: (t: ThemePref) => void;
  setDensity: (d: DensityPref) => void;
}

function applyTheme(theme: ThemePref) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

function applyDensity(density: DensityPref) {
  document.documentElement.classList.toggle('density-compact', density === 'compact');
}

export const usePrefsStore = create<PrefsState>((set) => ({
  theme: 'light',
  density: 'comfort',
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    void setSetting('theme', theme);
  },
  setDensity: (density) => {
    set({ density });
    applyDensity(density);
    void setSetting('density', density);
  },
}));

/** 起動時に保存済みの外観設定を読み込んで適用する */
export async function initPrefs(): Promise<void> {
  const [theme, density] = await Promise.all([
    getSetting<ThemePref>('theme'),
    getSetting<DensityPref>('density'),
  ]);
  usePrefsStore.setState({ theme: theme ?? 'light', density: density ?? 'comfort' });
  applyTheme(theme ?? 'light');
  applyDensity(density ?? 'comfort');

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyTheme(usePrefsStore.getState().theme));
}
