// ── Teams API ──
// GET /api/teams         — 列出所有团队配置
// GET /api/teams/:name   — 获取单个团队详情（含 inbox 消息）
// 数据源: ~/.claude/teams/*/config.json + inboxes/*.json

import { Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseTeamConfig, parseInbox } from '../parsers/team.js';

const router = Router();
const TEAMS_DIR = join(homedir(), '.claude', 'teams');

router.get('/', async (_req, res) => {
  try {
    const teamDirs = await readdir(TEAMS_DIR).catch(() => []);
    const teams = [];

    for (const dir of teamDirs) {
      const dirPath = join(TEAMS_DIR, dir);
      const dirStat = await stat(dirPath).catch(() => null);
      if (!dirStat?.isDirectory()) continue;

      const configPath = join(dirPath, 'config.json');
      const content = await readFile(configPath, 'utf-8').catch(() => '');
      if (!content) continue;

      teams.push(parseTeamConfig(content));
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

router.get('/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const configPath = join(TEAMS_DIR, name, 'config.json');
    const content = await readFile(configPath, 'utf-8').catch(() => '');
    if (!content) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const config = parseTeamConfig(content);

    // 读取所有 agent inbox
    const inboxDir = join(TEAMS_DIR, name, 'inboxes');
    const inboxFiles = await readdir(inboxDir).catch(() => []);
    const inboxes: Record<string, unknown> = {};

    for (const file of inboxFiles) {
      if (!file.endsWith('.json')) continue;
      const agentName = file.replace('.json', '');
      const inboxContent = await readFile(
        join(inboxDir, file),
        'utf-8',
      ).catch(() => '[]');
      inboxes[agentName] = parseInbox(inboxContent);
    }

    res.json({ ...config, inboxes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read team' });
  }
});

export default router;
