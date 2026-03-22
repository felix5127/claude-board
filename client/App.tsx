import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';

// ─────────────────────────────────────────────
// 页面占位组件
// 后续 Task 会替换为完整实现
// ─────────────────────────────────────────────

function SessionsPage() {
  return <div className="text-gray-500 dark:text-gray-400">Sessions — coming soon</div>;
}

function TimelinePage() {
  return <div className="text-gray-500 dark:text-gray-400">Timeline — coming soon</div>;
}

function AnalyticsPage() {
  return <div className="text-gray-500 dark:text-gray-400">Analytics — coming soon</div>;
}

function TeamsPage() {
  return <div className="text-gray-500 dark:text-gray-400">Teams — coming soon</div>;
}

// ─────────────────────────────────────────────
// 应用根组件
// BrowserRouter + MainLayout 嵌套路由
// ─────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<SessionsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="timeline/:sessionId" element={<TimelinePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="teams" element={<TeamsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
