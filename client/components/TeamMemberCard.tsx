// ── TeamMemberCard ──
// 团队成员卡片组件
// 展示 agent 名称、角色类型、模型信息，支持颜色标识

interface TeamMemberCardProps {
  readonly name: string;
  readonly agentType: string;
  readonly model: string;
  readonly color?: string;
}

// ── 颜色映射 ──

const COLOR_MAP: Record<string, string> = {
  blue: 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10',
  green: 'border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-500/10',
  red: 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-500/10',
  yellow: 'border-yellow-400 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-500/10',
  purple: 'border-purple-400 bg-purple-50 dark:border-purple-500 dark:bg-purple-500/10',
};

const DEFAULT_COLOR = 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50';

// ── 组件 ──

export function TeamMemberCard({ name, agentType, model, color }: TeamMemberCardProps) {
  const colorClass = COLOR_MAP[color ?? ''] ?? DEFAULT_COLOR;

  return (
    <div className={`p-3 rounded-lg border ${colorClass}`}>
      <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{name}</div>
      <div className="text-xs text-gray-500 mt-1">{agentType}</div>
      <div className="text-xs text-gray-400 dark:text-gray-600 mt-1 font-mono">
        {model.replace('claude-', '')}
      </div>
    </div>
  );
}
