import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Sessions } from './pages/Sessions';
import { Timeline } from './pages/Timeline';
import { Analytics } from './pages/Analytics';

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
          <Route index element={<Sessions />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="timeline/:sessionId" element={<Timeline />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="teams" element={<TeamsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
