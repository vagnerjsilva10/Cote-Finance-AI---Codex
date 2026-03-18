'use client';

import * as React from 'react';
import { Moon } from 'lucide-react';
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
  const { mounted } = useTheme();
  const isDarkMode = !mounted;

  return (
    <button
      type="button"
      onClick={(event) => event.preventDefault()}
      disabled
      aria-label="Tema dark blue premium ativo"
      title="Tema dark blue premium ativo"
      className={cn('theme-toggle-surface button-secondary px-3 py-2 text-sm font-medium', className)}
    >
      <Moon size={iconSize} />
      {showLabel ? <span className="text-xs font-semibold">{isDarkMode ? 'Dark' : 'Dark'}</span> : null}
    </button>
  );
}
