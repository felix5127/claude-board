// ── ToolDistribution ──
// 饼图分布组件
// 通用分布展示，支持 Model / Tool 等维度

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ToolData {
  readonly name: string;
  readonly count: number;
}

interface ToolDistributionProps {
  readonly data: readonly ToolData[];
  readonly title?: string;
}

// ── 8 色调色板，覆盖常见维度 ──
const COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#ec4899', '#6366f1',
];

export function ToolDistribution({ data, title = 'Distribution' }: ToolDistributionProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={[...data]}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#e5e7eb',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
