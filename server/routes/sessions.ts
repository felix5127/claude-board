// ── Sessions API ──
// GET /api/sessions — 返回所有会话的摘要列表
// 扫描 ~/.claude/projects/*/*.jsonl，解析每个文件并聚合统计

import { Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseJsonlFile, extractSessionSummary } from '../parsers/jsonl.js';

const router = Router();
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

router.get('/', async (_req, res) => {
  try {
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

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

export default router;
