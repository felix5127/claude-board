import express from 'express';
import cors from 'cors';
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

// ── 启动 ──

app.listen(PORT, () => {
  console.log(`Claude Board server running on http://localhost:${PORT}`);
  startWatcher(broker);
});
