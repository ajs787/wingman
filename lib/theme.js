// Three themes: rose "light", cool-navy "dark", brown/orange "warm".
// light is the absence of a class; the others are set on <html>.
export const THEMES = ['light', 'dark', 'warm'];
export const THEME_STORAGE_KEY = 'wingman-theme';

export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'warm');
  if (theme === 'dark' || theme === 'warm') root.classList.add(theme);
}

export function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(saved)) return saved;
  } catch {}
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function storeTheme(theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
}
