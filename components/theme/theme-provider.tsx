'use client';

import * as React from 'react';

export type AppTheme = 'dark';

const THEME_STORAGE_KEY = 'cote-theme';

type ThemeContextValue = {
  theme: AppTheme;
  mounted: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.add('dark');
  document.body.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<AppTheme>('dark');
  const [mounted, setMounted] = React.useState(false);

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState('dark');
    applyTheme('dark');
  }, []);

  React.useEffect(() => {
    setThemeState('dark');
    applyTheme('dark');
    setMounted(true);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      mounted,
      setTheme,
      toggleTheme,
    }),
    [mounted, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}

export { THEME_STORAGE_KEY };
