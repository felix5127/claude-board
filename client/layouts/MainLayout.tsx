import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

// ─────────────────────────────────────────────
// 主布局：顶部导航 + 内容区
// 包含 Tab 导航和主题切换
// ─────────────────────────────────────────────

const TABS = [
  { path: '/', label: 'Sessions' },
  { path: '/timeline', label: 'Timeline' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/teams', label: 'Teams' },
] as const;

export function MainLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-semibold tracking-tight">Claude Board</h1>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {/* 内容区域 */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
