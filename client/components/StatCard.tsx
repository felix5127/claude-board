// ── StatCard ──
// 统计卡片组件
// 用于展示关键指标数值，支持可选副标题

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800">
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
