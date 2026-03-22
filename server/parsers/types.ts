// ── 顶层 JSONL 事件类型 ──
// Claude Code conversation files use these event types
// to distinguish message roles and system events.
export type EventType =
  | 'user'
  | 'assistant'
  | 'progress'
  | 'file-history-snapshot'
  | 'queue-operation'
  | 'last-prompt'
  | 'system';

// ── Assistant content block 类型 ──
// Each block represents a distinct segment of assistant output:
// thinking (internal reasoning), text (visible reply),
// tool_use (function call), or tool_result (function return).

export interface ThinkingBlock {
  readonly type: 'thinking';
  readonly thinking: string;
  readonly signature?: string;
}

export interface TextBlock {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolUseBlock {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface ToolResultBlock {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: string | readonly ToolResultContent[];
}

export interface ToolResultContent {
  readonly type: string;
  readonly text?: string;
}

export type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock | ToolResultBlock;

// ── Token 用量 ──
export interface TokenUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}

// ── 解析后的消息 ──
// Normalized representation of a single JSONL event,
// with all content coerced to ContentBlock[] regardless of source shape.
export interface ParsedMessage {
  readonly type: EventType;
  readonly uuid: string;
  readonly parentUuid: string | null;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly cwd?: string;
  readonly version?: string;
  readonly gitBranch?: string;
  readonly slug?: string;
  readonly model?: string;
  readonly stopReason?: string | null;
  readonly content: readonly ContentBlock[];
  readonly usage?: TokenUsage;
  readonly isSidechain?: boolean;
}

// ── 会话摘要 ──
// Aggregated stats for a single session, derived from ParsedMessage[].
export interface SessionSummary {
  readonly sessionId: string;
  readonly slug?: string;
  readonly projectPath?: string;
  readonly gitBranch?: string;
  readonly firstPrompt?: string;
  readonly messageCount: number;
  readonly created: string;
  readonly modified: string;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
}

// ── Team 类型 ──
// Multi-agent team configuration types for collaborative sessions.

export interface TeamMember {
  readonly agentId: string;
  readonly name: string;
  readonly agentType: string;
  readonly model: string;
  readonly color?: string;
  readonly prompt?: string;
}

export interface TeamConfig {
  readonly name: string;
  readonly description: string;
  readonly createdAt: number;
  readonly leadAgentId: string;
  readonly members: readonly TeamMember[];
}

export interface InboxMessage {
  readonly from: string;
  readonly text: string;
  readonly summary?: string;
  readonly timestamp: string;
  readonly color?: string;
  readonly read: boolean;
}
