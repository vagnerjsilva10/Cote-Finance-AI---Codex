'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './theme-provider';

type ThemeToggleButtonProps = {
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
};

export function ThemeToggleButton({
  className,
  iconSize = 18,
  showLabel = false,
}: ThemeToggleButtonProps) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDarkMode = !mounted || theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-500 transition-all hover:text-white',
        className
      )}
    >
      {isDarkMode ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
      {showLabel ? <span className="text-xs font-semibold">{isDarkMode ? 'Claro' : 'Escuro'}</span> : null}
    </button>
  );
}
