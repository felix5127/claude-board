// ── Timeline Page ──
// 会话时间线页：Claude Board 核心视图
// 渲染完整对话流：用户消息（右对齐蓝色）、Claude 回复（左对齐灰色）
// 支持 SSE 实时刷新，通过 URL 参数 sessionId 定位会话

import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
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

// ── 组件 ──

export function Timeline() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: messages, loading, error, refetch } = useAPI<Message[]>(
    sessionId ? `/messages/${sessionId}` : ''
  );

  // SSE 实时监听：同 session 的消息变更或文件变更时刷新
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

  // ── 空状态 ──

  if (!sessionId) {
    return (
      <EmptyState
        title="No session selected"
        description="Select a session from the Sessions tab to view its timeline."
      />
    );
  }

  if (loading) return <LoadingSkeleton count={5} />;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  // ── 过滤：只显示 user 和 assistant 消息 ──

  const displayMessages = messages?.filter(
    (m) => m.type === 'user' || m.type === 'assistant'
  ) ?? [];

  if (displayMessages.length === 0) {
    return (
      <EmptyState
        title="Empty conversation"
        description={`Session ${sessionId.slice(0, 8)}... has no displayable messages.`}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 会话摘要 */}
      <div className="mb-4 text-sm text-gray-400 dark:text-gray-500">
        {displayMessages.length} messages in session {sessionId.slice(0, 8)}...
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
    </div>
  );
}
