import { describe, it, expect, vi } from 'vitest';
import { SSEBroker } from '../sse.js';

// ── SSEBroker 单元测试 ──

describe('SSEBroker', () => {
  it('adds and removes clients', () => {
    const broker = new SSEBroker();
    const mockRes = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes);
    expect(broker.clientCount).toBe(1);

    broker.removeClient(mockRes);
    expect(broker.clientCount).toBe(0);
  });

  it('broadcasts events to all clients', () => {
    const broker = new SSEBroker();
    const mockRes1 = { write: vi.fn(), on: vi.fn() } as any;
    const mockRes2 = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes1);
    broker.addClient(mockRes2);

    broker.broadcast({ type: 'session-update', sessionId: 'abc' });

    expect(mockRes1.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"session-update"')
    );
    expect(mockRes2.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"session-update"')
    );
  });

  it('does not broadcast to removed clients', () => {
    const broker = new SSEBroker();
    const mockRes = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes);
    broker.removeClient(mockRes);
    broker.broadcast({ type: 'test' });

    // write 只在 addClient 时调用一次 (':ok\n\n')，broadcast 不应再触发
    expect(mockRes.write).toHaveBeenCalledTimes(1);
  });

  it('sends SSE-formatted data with "data:" prefix', () => {
    const broker = new SSEBroker();
    const mockRes = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes);
    broker.broadcast({ type: 'file-change', path: '/test.jsonl' });

    // 第二次 write 调用 = broadcast 数据
    const broadcastCall = mockRes.write.mock.calls[1][0] as string;
    expect(broadcastCall).toMatch(/^data: /);
    expect(broadcastCall).toMatch(/\n\n$/);
  });

  it('registers close handler to auto-remove client', () => {
    const broker = new SSEBroker();
    const mockRes = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes);

    // 验证注册了 'close' 事件监听
    expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));

    // 模拟触发 close 回调
    const closeHandler = mockRes.on.mock.calls.find(
      (call: any[]) => call[0] === 'close'
    )?.[1] as () => void;
    closeHandler();

    expect(broker.clientCount).toBe(0);
  });

  it('handles multiple adds of the same client idempotently', () => {
    const broker = new SSEBroker();
    const mockRes = { write: vi.fn(), on: vi.fn() } as any;

    broker.addClient(mockRes);
    broker.addClient(mockRes);

    // Set 天然去重，clientCount 应为 1
    expect(broker.clientCount).toBe(1);
  });
});
