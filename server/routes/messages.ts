// ── Messages API ──
// GET /api/messages/:sessionId — 返回指定会话的所有解析消息
// 在 ~/.claude/projects/*/ 中搜索匹配的 JSONL 文件

import { Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseJsonlFile } from '../parsers/jsonl.js';

const router = Router();
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = await findSessionFile(sessionId);
    if (!filePath) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const content = await readFile(filePath, 'utf-8');
    const messages = parseJsonlFile(content);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read session' });
  }
});

// ────────────────────────────────────────────
// findSessionFile
// ────────────────────────────────────────────
// 遍历所有 project 目录，定位 sessionId 对应的 .jsonl 文件

async function findSessionFile(sessionId: string): Promise<string | null> {
  const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);

  for (const dir of projectDirs) {
    const dirPath = join(PROJECTS_DIR, dir);
    const dirStat = await stat(dirPath).catch(() => null);
    if (!dirStat?.isDirectory()) continue;

    const filePath = join(dirPath, `${sessionId}.jsonl`);
    try {
      await stat(filePath);
      return filePath;
    } catch {
      continue;
    }
  }

  return null;
}

export default router;
