export type ThemeMode = 'light' | 'dark';

export function getInitialTheme(storedTheme: string | null, fallback: ThemeMode = 'light'): ThemeMode {
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  return fallback;
}
