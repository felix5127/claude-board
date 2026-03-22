// ── SSE Events API ──
// GET /api/events — Server-Sent Events 端点
// 客户端通过此端点接收实时文件变更通知

import { Router } from 'express';
import type { SSEBroker } from '../sse.js';

export function createEventsRouter(broker: SSEBroker): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    broker.addClient(res);

    req.on('close', () => {
      broker.removeClient(res);
    });
  });

  return router;
}
