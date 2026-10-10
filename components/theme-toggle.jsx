'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Flame } from 'lucide-react';
import { THEMES, applyTheme, readTheme, storeTheme } from '@/lib/theme';

const NEXT_LABEL = { light: 'dark', dark: 'warm', warm: 'light' };
const ICON = { light: Sun, dark: Moon, warm: Flame };

// Compact control for the marketing nav: cycles light -> dark -> warm.
// Settings has the explicit three-option picker.
export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
  }

  const Icon = ICON[theme] || Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Switch to ${NEXT_LABEL[theme]}.`}
      title={`Theme: ${theme} — switch to ${NEXT_LABEL[theme]}`}
      className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-white/10"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
