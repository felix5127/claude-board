// ── TokenChart ──
// Token 用量柱状图
// 展示每个 Session 的 input/output Token 分布

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TokenData {
  readonly name: string;
  readonly input: number;
  readonly output: number;
}

interface TokenChartProps {
  readonly data: readonly TokenData[];
}

export function TokenChart({ data }: TokenChartProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">Token Usage by Session</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={[...data]}>
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#e5e7eb',
            }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />
          <Bar dataKey="input" fill="#3b82f6" name="Input" radius={[2, 2, 0, 0]} />
          <Bar dataKey="output" fill="#8b5cf6" name="Output" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
