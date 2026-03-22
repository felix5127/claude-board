import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────
// 主题切换 Hook
// 持久化到 localStorage，自动同步 <html> class
// ─────────────────────────────────────────────

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'claude-board-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme } as const;
}
