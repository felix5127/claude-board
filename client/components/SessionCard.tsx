// ── SessionCard ──
// 会话卡片组件
// 展示单个会话的摘要信息：标题、项目路径、首条消息、统计指标
// 点击导航到对应的 Timeline 页

import { useNavigate } from 'react-router-dom';

interface SessionCardProps {
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

// ── 格式化工具 ──

const formatTokens = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const formatTime = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortenPath = (path: string): string =>
  path.replace(/^\/Users\/[^/]+\//, '~/');

// ── 组件 ──

export function SessionCard(props: SessionCardProps) {
  const navigate = useNavigate();
  const totalTokens = props.totalInputTokens + props.totalOutputTokens;
  const shortProject = props.projectPath ? shortenPath(props.projectPath) : undefined;

  return (
    <button
      onClick={() => navigate(`/timeline/${props.sessionId}`)}
      className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gray-400
                 bg-gray-50 hover:bg-gray-100
                 dark:border-gray-800 dark:hover:border-gray-600
                 dark:bg-gray-900/50 dark:hover:bg-gray-800/50 transition-all group"
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {props.slug ?? props.sessionId.slice(0, 8)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatTime(props.modified)}
        </span>
      </div>

      {/* 项目路径 */}
      {shortProject && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 truncate font-mono">
          {shortProject}
        </div>
      )}

      {/* 首条消息预览 */}
      {props.firstPrompt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {props.firstPrompt}
        </p>
      )}

      {/* 统计指标 */}
      <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span>{props.messageCount} msgs</span>
        <span>{formatTokens(totalTokens)} tokens</span>
        <span>{props.toolCallCount} tools</span>
        {props.model && (
          <span className="text-gray-300 dark:text-gray-600">
            {props.model.replace('claude-', '')}
          </span>
        )}
      </div>
    </button>
  );
}
