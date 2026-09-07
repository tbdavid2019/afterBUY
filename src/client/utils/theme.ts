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
  { id: 'coral', label: '珊瑚', labelEn: 'Coral', dotColor: '#d85a42', ringColor: '#b45140', lightBg: '#f7f5f0' },
  { id: 'mint', label: '薄荷', labelEn: 'Mint', dotColor: '#10b981', ringColor: '#059669', lightBg: '#f2f7f4' },
  { id: 'peach', label: '蜜桃', labelEn: 'Peach', dotColor: '#f43f5e', ringColor: '#e14d66', lightBg: '#fbf4f2' },
  { id: 'sky', label: '天空', labelEn: 'Sky', dotColor: '#0284c7', ringColor: '#0284c7', lightBg: '#f0f6fa' },
  { id: 'lilac', label: '丁香', labelEn: 'Lilac', dotColor: '#8b5cf6', ringColor: '#7c3aed', lightBg: '#f6f4fa' },
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
