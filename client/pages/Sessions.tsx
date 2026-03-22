// ── Sessions Page ──
// 会话列表页：卡片网格 + 搜索过滤 + SSE 实时刷新
// 从 /api/sessions 拉取分页数据，监听 /api/events 自动刷新

import { useState, useCallback, useMemo } from 'react';
import { useAPI } from '../hooks/useAPI';
import { useSSE } from '../hooks/useSSE';
import { SessionCard } from '../components/SessionCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

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

interface SessionsResponse {
  readonly sessions: readonly SessionData[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

// ── Token 格式化 ──

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── 组件 ──

export function Sessions() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useAPI<SessionsResponse>(
    `/sessions?limit=500&search=${encodeURIComponent(search)}`
  );

  // SSE 实时刷新：任何文件变更都触发 refetch
  useSSE({
    onMessage: useCallback(() => {
      refetch();
    }, [refetch]),
  });

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;

  // 汇总 total tokens
  const totalTokens = useMemo(
    () =>
      sessions.reduce(
        (sum, s) => sum + s.totalInputTokens + s.totalOutputTokens,
        0,
      ),
    [sessions],
  );

  if (loading) {
    return <LoadingSkeleton count={6} />;
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
        {total} sessions found &middot; {formatTokens(totalTokens)} total tokens
      </div>

      {/* 空状态 */}
      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description={
            search
              ? `No sessions match "${search}". Try a different search term.`
              : 'No Claude Code sessions detected yet.'
          }
        />
      ) : (
        /* 卡片网格 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.sessionId} {...session} />
          ))}
        </div>
      )}
    </div>
  );
}
