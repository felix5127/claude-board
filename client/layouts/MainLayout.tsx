import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

// ─────────────────────────────────────────────
// 主布局：左侧导航 sidebar + 内容区
// sidebar 固定在左侧，内容区独立滚动
// ─────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/', label: 'Sessions' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/teams', label: 'Teams' },
] as const;

export function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // /session/* 子路由也需要高亮 Sessions tab
  const isSessionDetail = location.pathname.startsWith('/session/');

  return (
    <div className="h-screen flex bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
      {/* ── 左侧 Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Claude Board</h1>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const forceActive = item.path === '/' && isSessionDetail;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => {
                  const active = isActive || forceActive;
                  return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
                  }`;
                }}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* 底部：主题切换 */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </aside>

      {/* ── 内容区域（独立滚动） ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
