export type ThemeMode = 'light' | 'dark';
export type ThemePalette = 'saffron';

export interface ThemePaletteConfig {
  id: ThemePalette;
  label: string;
  labelEn: string;
  dotColor: string;
  ringColor: string;
  lightBg: string;
  darkBg: string;
}

export const THEME_PALETTES: ThemePaletteConfig[] = [
  {
    id: 'saffron',
    label: '番紅花金 · 2MD',
    labelEn: 'Saffron · 2MD',
    dotColor: '#FFB010',
    ringColor: '#17324D',
    lightBg: '#FFB010',
    darkBg: '#17324D',
  },
];

export function getInitialTheme(storedTheme: string | null, fallback: ThemeMode = 'light'): ThemeMode {
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  return fallback;
}

export function getInitialPalette(storedPalette: string | null, fallback: ThemePalette = 'saffron'): ThemePalette {
  if (THEME_PALETTES.some((p) => p.id === storedPalette)) {
    return storedPalette as ThemePalette;
  }
  return fallback;
}
