'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Flame } from 'lucide-react';
import { applyTheme, readTheme, storeTheme } from '@/lib/theme';

const OPTIONS = [
  { value: 'light', label: 'Light', hint: 'Rose', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Cool navy', icon: Moon },
  { value: 'warm', label: 'Warm', hint: 'Brown', icon: Flame },
];

export default function ThemeSelector() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function pick(value) {
    setTheme(value);
    applyTheme(value);
    storeTheme(value);
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(value)}
            className={`chip flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'chip-selected' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className="text-[11px] font-normal opacity-75">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
