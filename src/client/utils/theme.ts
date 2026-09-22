export type ThemeMode = 'light' | 'dark';
export type ThemePalette = 'coral' | 'mint' | 'peach' | 'sky' | 'lilac';

export interface ThemePaletteConfig {
  id: ThemePalette;
  label: string;
  labelEn: string;
  dotColor: string;
  ringColor: string;
  lightBg: string;
}

export const THEME_PALETTES: ThemePaletteConfig[] = [
  { id: 'coral', label: '暖陶土', labelEn: 'Terracotta', dotColor: '#C86F58', ringColor: '#A8543E', lightBg: '#F9F6F4' },
  { id: 'peach', label: '柔和桃', labelEn: 'Peach Fuzz', dotColor: '#D97757', ringColor: '#C86F58', lightBg: '#FFF5EE' },
  { id: 'lilac', label: '暮色黑李', labelEn: 'Plum Noir', dotColor: '#8B5A73', ringColor: '#5D3A4D', lightBg: '#F8F5F4' },
  { id: 'mint', label: '鼠尾草綠', labelEn: 'Sage Mist', dotColor: '#5E8271', ringColor: '#456354', lightBg: '#F5F7F6' },
  { id: 'sky', label: '岩霧藍', labelEn: 'Nordic Slate', dotColor: '#4E6E82', ringColor: '#3A5465', lightBg: '#F4F6F8' },
];

export function getInitialTheme(storedTheme: string | null, fallback: ThemeMode = 'light'): ThemeMode {
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  return fallback;
}

export function getInitialPalette(storedPalette: string | null, fallback: ThemePalette = 'coral'): ThemePalette {
  if (THEME_PALETTES.some((p) => p.id === storedPalette)) {
    return storedPalette as ThemePalette;
  }
  return fallback;
}
