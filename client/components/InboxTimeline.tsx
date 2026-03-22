// ── InboxTimeline ──
// Agent 收件箱时间线
// 展示 agent 之间的通信消息列表
// 支持结构化消息（JSON payload）的类型标签显示

// ── 类型定义 ──

interface InboxMessage {
  readonly from: string;
  readonly text: string;
  readonly summary?: string;
  readonly timestamp: string;
  readonly color?: string;
  readonly read: boolean;
}

interface InboxTimelineProps {
  readonly messages: readonly InboxMessage[];
  readonly agentName: string;
}

// ── 解析结构化消息 ──

interface ParsedDisplay {
  readonly msgType: string;
  readonly displayText: string;
}

function parseStructuredMessage(text: string): ParsedDisplay | null {
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text);
    const msgType = (parsed.type as string) ?? '';
    const displayText = (parsed.subject as string)
      ?? (parsed.idleReason as string)
      ?? msgType;
    return { msgType, displayText };
  } catch {
    return null;
  }
}

// ── 时间格式化 ──

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── 消息样式 ──

const READ_STYLE = 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30';
const UNREAD_STYLE = 'border-blue-300 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20';

// ── 组件 ──

export function InboxTimeline({ messages, agentName }: InboxTimelineProps) {
  if (!messages.length) {
    return <div className="text-xs text-gray-400 dark:text-gray-600">No messages</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((msg, i) => {
        const structured = parseStructuredMessage(msg.text);
        const displayText = structured?.displayText ?? msg.text;

        return (
          <div
            key={`${msg.timestamp}-${i}`}
            className={`px-3 py-2 rounded-lg text-xs border ${msg.read ? READ_STYLE : UNREAD_STYLE}`}
          >
            {/* 发送方 + 时间 */}
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {msg.from} → {agentName}
              </span>
              <span className="text-gray-400 dark:text-gray-600">
                {formatTime(msg.timestamp)}
              </span>
            </div>

            {/* 结构化消息类型标签 */}
            {structured?.msgType && (
              <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400 mb-1">
                {structured.msgType}
              </span>
            )}

            {/* 消息内容 */}
            <p className="text-gray-500 dark:text-gray-400 break-words">
              {displayText.slice(0, 200)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
