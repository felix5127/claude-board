// ── Sessions API ──
// GET /api/sessions — 返回会话摘要列表
// 支持分页 (?limit=50&offset=0) 和搜索 (?search=xxx)
// 内置 10 秒 TTL 内存缓存，避免每次请求重新解析全部 JSONL

import { Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseJsonlFile, extractSessionSummary } from '../parsers/jsonl.js';

const router = Router();
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

// ── 缓存层 ──

interface CacheEntry {
  readonly data: ReadonlyArray<Record<string, unknown>>;
  readonly timestamp: number;
}

const CACHE_TTL_MS = 10_000; // 10 秒
let sessionCache: CacheEntry | null = null;

/** 使缓存失效（供外部 watcher 调用） */
export function invalidateSessionCache(): void {
  sessionCache = null;
}

/** 检查缓存是否在 TTL 内有效 */
function isCacheValid(): boolean {
  if (!sessionCache) return false;
  return Date.now() - sessionCache.timestamp < CACHE_TTL_MS;
}

// ── 加载全部会话 ──

async function loadAllSessions(): Promise<ReadonlyArray<Record<string, unknown>>> {
  if (isCacheValid()) {
    return sessionCache!.data;
  }

  const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);
  const sessions: Array<Record<string, unknown>> = [];

  for (const dir of projectDirs) {
    const dirPath = join(PROJECTS_DIR, dir);
    const dirStat = await stat(dirPath).catch(() => null);
    if (!dirStat?.isDirectory()) continue;

    const files = await readdir(dirPath).catch(() => []);
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    for (const file of jsonlFiles) {
      const filePath = join(dirPath, file);
      const sessionId = file.replace('.jsonl', '');
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat) continue;

      const content = await readFile(filePath, 'utf-8').catch(() => '');
      const messages = parseJsonlFile(content);
      const summary = extractSessionSummary(sessionId, messages);

      sessions.push({
        ...summary,
        projectDir: dir,
        fileSize: fileStat.size,
      });
    }
  }

  // 按修改时间倒序
  sessions.sort((a, b) =>
    String(b.modified).localeCompare(String(a.modified))
  );

  sessionCache = { data: sessions, timestamp: Date.now() };
  return sessions;
}

// ── 搜索过滤 ──

function matchesSearch(
  session: Record<string, unknown>,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = ['sessionId', 'slug', 'projectPath', 'firstPrompt'] as const;
  return fields.some((field) => {
    const val = session[field];
    return typeof val === 'string' && val.toLowerCase().includes(q);
  });
}

// ── 路由 ──

router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit)) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset)) || 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const allSessions = await loadAllSessions();

    // 搜索过滤
    const filtered = search
      ? allSessions.filter((s) => matchesSearch(s, search))
      : allSessions;

    // 分页切片
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      sessions: paginated,
      total: filtered.length,
      limit,
      offset,
    });
  } catch {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

export default router;
