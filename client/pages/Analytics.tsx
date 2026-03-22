// ── Analytics ──
// 分析仪表盘页面
// 聚合 Session 数据，展示统计卡片、Token 柱状图、模型分布饼图

import { useAPI } from '../hooks/useAPI';
import { StatCard } from '../components/StatCard';
import { TokenChart } from '../components/TokenChart';
import { ToolDistribution } from '../components/ToolDistribution';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

// ── Session 摘要类型 ──

interface SessionData {
  readonly sessionId: string;
  readonly slug?: string;
  readonly messageCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
  readonly modified: string;
}

interface SessionsResponse {
  readonly sessions: readonly SessionData[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

// ── 数值格式化 ──

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function Analytics() {
  const { data, loading, error } = useAPI<SessionsResponse>('/sessions?limit=500');

  if (loading) {
    return <LoadingSkeleton count={4} />;
  }
  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  const sessions = data?.sessions ?? [];

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No analytics data"
        description="Session data will appear here once Claude Code sessions are detected."
      />
    );
  }

  // ── 聚合统计 ──
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0);
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const totalTools = sessions.reduce((sum, s) => sum + s.toolCallCount, 0);

  // ── Token 柱状图数据（按总 Token 降序，取前 20） ──
  const sortedByTokens = [...sessions]
    .sort((a, b) => (b.totalInputTokens + b.totalOutputTokens) - (a.totalInputTokens + a.totalOutputTokens))
    .slice(0, 20);

  const tokenChartData = sortedByTokens.map((s) => ({
    name: s.slug?.slice(0, 15) ?? s.sessionId.slice(0, 8),
    input: s.totalInputTokens,
    output: s.totalOutputTokens,
  }));

  // ── 模型分布饼图数据 ──
  const modelCounts = new Map<string, number>();
  for (const s of sessions) {
    const m = s.model?.replace('claude-', '') ?? 'unknown';
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }
  const modelData = [...modelCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      {/* ── 统计卡片区 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Sessions" value={String(sessions.length)} />
        <StatCard label="Total Messages" value={formatNum(totalMessages)} />
        <StatCard label="Total Tokens" value={formatNum(totalTokens)} />
        <StatCard label="Tool Calls" value={formatNum(totalTools)} />
      </div>

      {/* ── 图表区 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenChart data={tokenChartData} />
        <ToolDistribution data={modelData} title="Model Distribution" />
      </div>
    </div>
  );
}
