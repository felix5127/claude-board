// ── Sessions Page ──
// 会话列表页：卡片网格 + 搜索过滤 + SSE 实时刷新
// 从 /api/sessions 拉取数据，监听 /api/events 自动刷新

import { useState, useCallback } from 'react';
import { useAPI } from '../hooks/useAPI';
import { useSSE } from '../hooks/useSSE';
import { SessionCard } from '../components/SessionCard';

// ── 类型定义 ──

interface SessionData {
  readonly sessionId: string;
  readonly slug?: string;
  readonly projectPath?: string;
  readonly firstPrompt?: string;
  readonly messageCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
  readonly created: string;
  readonly modified: string;
}

// ── 搜索过滤 ──

function matchesSearch(session: SessionData, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    session.sessionId.toLowerCase().includes(q) ||
    (session.slug?.toLowerCase().includes(q) ?? false) ||
    (session.projectPath?.toLowerCase().includes(q) ?? false) ||
    (session.firstPrompt?.toLowerCase().includes(q) ?? false)
  );
}

// ── 组件 ──

export function Sessions() {
  const [search, setSearch] = useState('');
  const { data: sessions, loading, error, refetch } = useAPI<SessionData[]>('/sessions');

  // SSE 实时刷新：任何文件变更都触发 refetch
  useSSE({
    onMessage: useCallback(() => {
      refetch();
    }, [refetch]),
  });

  const filtered = sessions?.filter((s) => matchesSearch(s, search));

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading sessions...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  return (
    <div>
      {/* 搜索栏 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg
                     bg-white border border-gray-300 text-gray-800 placeholder-gray-400
                     dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500
                     focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 统计摘要 */}
      <div className="mb-4 text-sm text-gray-400 dark:text-gray-500">
        {filtered?.length ?? 0} sessions found
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((session) => (
          <SessionCard key={session.sessionId} {...session} />
        ))}
      </div>
    </div>
  );
}
