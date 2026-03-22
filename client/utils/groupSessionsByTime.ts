// ── groupSessionsByTime ──
// 按时间分组会话：今天 / 昨天 / 本周 / 本月 / 更早
// 纯函数，泛型设计，跳过空分组
// 周起始日为周一（ISO 8601）

export interface TimeGroup<T> {
  readonly label: string;
  readonly sessions: readonly T[];
}

// ── 时间边界计算 ──

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  // ISO 8601: 周一为起始日（Sunday=0 → offset=6, Monday=0）
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

// ── 分组标签与边界 ──

interface Bucket {
  readonly label: string;
  readonly start: Date;
}

function buildBuckets(now: Date): readonly Bucket[] {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  return [
    { label: '今天', start: today },
    { label: '昨天', start: yesterday },
    { label: '本周', start: weekStart },
    { label: '本月', start: monthStart },
    { label: '更早', start: new Date(0) },
  ];
}

// ── 核心分组函数 ──

export function groupSessionsByTime<T extends { modified: string }>(
  sessions: readonly T[],
  now: Date = new Date(),
): readonly TimeGroup<T>[] {
  const buckets = buildBuckets(now);

  // 初始化每个桶的会话数组
  const grouped = new Map<string, T[]>();
  for (const bucket of buckets) {
    grouped.set(bucket.label, []);
  }

  // 分配会话到对应桶
  for (const session of sessions) {
    const modified = new Date(session.modified);
    let placed = false;
    for (const bucket of buckets) {
      if (modified >= bucket.start) {
        grouped.get(bucket.label)!.push(session);
        placed = true;
        break;
      }
    }
    // 兜底：不应到达，但防御性编程
    if (!placed) {
      grouped.get('更早')!.push(session);
    }
  }

  // 过滤空分组，保持桶顺序
  return buckets
    .map((bucket) => ({
      label: bucket.label,
      sessions: grouped.get(bucket.label)! as readonly T[],
    }))
    .filter((group) => group.sessions.length > 0);
}
