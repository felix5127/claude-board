// ── Timeline Page ──
// 会话时间线页：Claude Board 核心视图
// 顶部元信息面板 + 搜索过滤 + 消息流
// 支持按角色过滤、按内容搜索

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { useAPI } from '../hooks/useAPI';
import { useSSE } from '../hooks/useSSE';
import { MessageBubble, type ContentBlock } from '../components/MessageBubble';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

// ── 类型定义 ──

interface Message {
  readonly type: string;
  readonly uuid: string;
  readonly content: readonly ContentBlock[];
  readonly timestamp: string;
  readonly model?: string;
  readonly sessionId: string;
}

type FilterType = 'all' | 'user' | 'assistant';

// ── 工具函数 ──

function extractBlockText(block: ContentBlock): string {
  if (block.type === 'text') return block.text ?? '';
  if (block.type === 'tool_use') return block.name ?? '';
  if (block.type === 'thinking') return block.thinking ?? '';
  if (block.type === 'tool_result') {
    if (typeof block.content === 'string') return block.content;
    if (Array.isArray(block.content)) {
      return block.content.map((c) => c.text ?? '').join(' ');
    }
  }
  return '';
}

// ── 组件 ──

export function Timeline() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: messages, loading, error, refetch } = useAPI<Message[]>(
    sessionId ? `/messages/${sessionId}` : ''
  );

  // SSE 实时监听
  useSSE({
    onMessage: useCallback(
      (event: Record<string, unknown>) => {
        if (event.sessionId === sessionId || event.type === 'file-change') {
          refetch();
        }
      },
      [sessionId, refetch]
    ),
    enabled: !!sessionId,
  });

  // ── 只保留 user + assistant 消息 ──

  const allMessages = useMemo(
    () => messages?.filter((m) => m.type === 'user' || m.type === 'assistant') ?? [],
    [messages],
  );

  // ── 元信息统计 ──

  const stats = useMemo(() => {
    const userCount = allMessages.filter((m) => m.type === 'user').length;
    const assistantCount = allMessages.filter((m) => m.type === 'assistant').length;
    const toolCallCount = allMessages.reduce(
      (sum, m) => sum + m.content.filter((b) => b.type === 'tool_use').length,
      0,
    );
    const models = [...new Set(allMessages.map((m) => m.model).filter(Boolean))];
    const timestamps = allMessages
      .map((m) => new Date(m.timestamp).getTime())
      .filter((t) => !isNaN(t));
    const duration =
      timestamps.length >= 2
        ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60000)
        : 0;

    return { userCount, assistantCount, toolCallCount, models, duration };
  }, [allMessages]);

  // ── 搜索 + 过滤 ──

  const displayMessages = useMemo(() => {
    let filtered = allMessages;

    if (filter !== 'all') {
      filtered = filtered.filter((m) => m.type === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) =>
        m.content.some((block) => extractBlockText(block).toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [allMessages, filter, search]);

  // ── 渲染 ──

  if (loading) return <LoadingSkeleton count={5} />;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  if (allMessages.length === 0) {
    return (
      <EmptyState
        title="Empty conversation"
        description={`Session ${sessionId?.slice(0, 8)}... has no displayable messages.`}
      />
    );
  }

  const FILTERS: readonly { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'user', label: 'User' },
    { value: 'assistant', label: 'Assistant' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/')}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800
                   dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <span>&larr;</span>
        <span>返回会话列表</span>
      </button>

      {/* ── 元信息面板 ── */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Messages', value: String(allMessages.length) },
          { label: 'User', value: String(stats.userCount) },
          { label: 'Assistant', value: String(stats.assistantCount) },
          { label: 'Tool Calls', value: String(stats.toolCallCount) },
          { label: 'Duration', value: `${stats.duration}min` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
          >
            <div className="text-xs text-gray-400 dark:text-gray-500">{stat.label}</div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── 搜索 + 过滤 ── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm px-3 py-1.5 rounded-lg text-sm
                     bg-white border border-gray-300 text-gray-800 placeholder-gray-400
                     dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500
                     focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 结果计数 */}
      <div className="mb-4 text-sm text-gray-400 dark:text-gray-500">
        {displayMessages.length === allMessages.length
          ? `${allMessages.length} messages`
          : `${displayMessages.length} / ${allMessages.length} messages`}
        {' in session '}
        {sessionId?.slice(0, 8)}...
        {stats.models.length > 0 && (
          <span className="ml-2 text-gray-300 dark:text-gray-600">
            {stats.models.map((m) => (m as string).replace('claude-', '')).join(', ')}
          </span>
        )}
      </div>

      {/* 消息列表 */}
      <div className="space-y-2">
        {displayMessages.map((msg) => (
          <MessageBubble
            key={msg.uuid}
            type={msg.type as 'user' | 'assistant'}
            content={msg.content}
            timestamp={msg.timestamp}
            model={msg.model}
          />
        ))}
      </div>

      {/* 搜索无结果 */}
      {displayMessages.length === 0 && (search || filter !== 'all') && (
        <EmptyState
          title="No matches"
          description={search ? `No messages match "${search}".` : `No ${filter} messages in this session.`}
        />
      )}
    </div>
  );
}
