// ── useSSE ──
// Server-Sent Events Hook
// 订阅 /api/events 接收实时文件变更通知
// 使用 ref 存储回调，避免 EventSource 反复重连

import { useEffect, useRef } from 'react';

interface SSEOptions {
  readonly onMessage: (event: Record<string, unknown>) => void;
  readonly enabled?: boolean;
}

export function useSSE({ onMessage, enabled = true }: SSEOptions) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource('/api/events');

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {
        // 忽略无效 JSON
      }
    };

    return () => {
      es.close();
    };
  }, [enabled]);
}
