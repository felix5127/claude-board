import { watch } from 'chokidar';
import type { SSEBroker } from './sse.js';
import { homedir } from 'os';
import { join } from 'path';

// ── Chokidar 文件监听器 ──
// 监控 ~/.claude/ 下的 JSONL / JSON 文件变更，
// 通过 SSEBroker 实时推送到前端

const CLAUDE_DIR = join(homedir(), '.claude');

/** 从文件路径中提取 session ID（UUID 格式的 .jsonl 文件名） */
function extractSessionId(filePath: string): string | null {
  const match = filePath.match(/([0-9a-f-]{36})\.jsonl$/);
  return match?.[1] ?? null;
}

/** 启动文件监听，将变更事件广播到 SSEBroker */
export function startWatcher(broker: SSEBroker): void {
  const watcher = watch(
    [
      join(CLAUDE_DIR, 'projects', '**', '*.jsonl'),
      join(CLAUDE_DIR, 'teams', '**', 'config.json'),
      join(CLAUDE_DIR, 'teams', '**', 'inboxes', '*.json'),
      join(CLAUDE_DIR, 'sessions', '*.json'),
      join(CLAUDE_DIR, 'tasks', '**', '*.json'),
    ],
    {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    }
  );

  watcher.on('change', (path) => {
    const sessionId = extractSessionId(path);
    broker.broadcast({
      type: 'file-change',
      path,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('add', (path) => {
    broker.broadcast({
      type: 'file-add',
      path,
      timestamp: new Date().toISOString(),
    });
  });

  console.log(`Watching ${CLAUDE_DIR} for changes...`);
}
