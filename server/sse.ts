import type { Response } from 'express';

// ── SSE 事件接口 ──

export interface SSEEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

// ── SSE Broker ──
// 管理所有已连接的 SSE 客户端，统一广播文件变更事件

export class SSEBroker {
  private readonly clients = new Set<Response>();

  get clientCount(): number {
    return this.clients.size;
  }

  /** 注册新的 SSE 客户端，发送初始握手，并监听连接关闭 */
  addClient(res: Response): void {
    this.clients.add(res);
    res.write(':ok\n\n');
    res.on('close', () => this.removeClient(res));
  }

  /** 移除已断开的客户端 */
  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  /** 向所有已连接客户端广播 SSE 事件 */
  broadcast(event: SSEEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.write(data);
    }
  }
}
