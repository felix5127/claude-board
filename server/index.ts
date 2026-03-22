import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SSEBroker } from './sse.js';
import { startWatcher } from './watcher.js';
import sessionsRouter from './routes/sessions.js';
import messagesRouter from './routes/messages.js';
import teamsRouter from './routes/teams.js';
import { createEventsRouter } from './routes/events.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3456;
const broker = new SSEBroker();

app.use(cors());
app.use(express.json());

// ── API 路由 ──

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    clients: broker.clientCount,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/sessions', sessionsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/events', createEventsRouter(broker));

// ── 生产模式：静态文件服务 ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '..', 'client');

app.use(express.static(clientDist));

// SPA fallback — 所有非 API 路由返回 index.html（Express 5 需要命名通配符）
app.get('{*path}', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// ── 启动（导出 Promise 供 CLI 使用） ──

export const serverReady = new Promise<number>((resolve) => {
  app.listen(PORT, () => {
    console.log(`Claude Board server running on http://localhost:${PORT}`);
    startWatcher(broker);
    resolve(PORT);
  });
});
