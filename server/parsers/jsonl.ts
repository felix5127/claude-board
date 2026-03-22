// ── JSONL Parser ──
// Parses Claude Code conversation files (.jsonl) into typed messages.
// Each line is an independent JSON object representing one event.
// User messages carry string content; assistant messages carry
// structured content arrays (thinking / text / tool_use blocks).

import type {
  ParsedMessage,
  ContentBlock,
  TextBlock,
  TokenUsage,
  SessionSummary,
  EventType,
} from './types.js';

// ── 跳过的事件类型 ──
// These event types carry no conversation content and are
// filtered out during parsing to keep the message stream clean.
const SKIP_TYPES: ReadonlySet<string> = new Set([
  'queue-operation',
  'last-prompt',
  'progress',
  'file-history-snapshot',
]);

// ────────────────────────────────────────────
// parseJsonlLine
// ────────────────────────────────────────────
// Parses a single JSONL line into a ParsedMessage.
// Returns null for skipped event types or malformed JSON.

export function parseJsonlLine(line: string): ParsedMessage | null {
  try {
    const raw = JSON.parse(line) as Record<string, unknown>;
    const type = raw.type as EventType;

    if (SKIP_TYPES.has(type)) return null;

    const msg = (raw.message ?? {}) as Record<string, unknown>;
    const content = normalizeContent(type, msg);
    const usage = extractUsage(msg);

    return {
      type,
      uuid: (raw.uuid as string) ?? '',
      parentUuid: (raw.parentUuid as string) ?? null,
      timestamp: (raw.timestamp as string) ?? '',
      sessionId: (raw.sessionId as string) ?? '',
      cwd: raw.cwd as string | undefined,
      version: raw.version as string | undefined,
      gitBranch: raw.gitBranch as string | undefined,
      slug: raw.slug as string | undefined,
      model: msg.model as string | undefined,
      stopReason: (msg.stop_reason as string) ?? null,
      content,
      usage,
      isSidechain: (raw.isSidechain as boolean) ?? false,
    };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// parseJsonlFile
// ────────────────────────────────────────────
// Splits a full JSONL file into lines, parses each,
// and returns only the successfully parsed messages.

export function parseJsonlFile(fileContent: string): readonly ParsedMessage[] {
  if (!fileContent.trim()) return [];

  const messages: ParsedMessage[] = [];
  for (const line of fileContent.split('\n')) {
    if (!line.trim()) continue;
    const parsed = parseJsonlLine(line);
    if (parsed !== null) {
      messages.push(parsed);
    }
  }
  return messages;
}

// ────────────────────────────────────────────
// extractSessionSummary
// ────────────────────────────────────────────
// Aggregates a list of parsed messages into a SessionSummary.
// Single-pass: iterates once to collect all statistics.

export function extractSessionSummary(
  sessionId: string,
  messages: readonly ParsedMessage[],
): SessionSummary {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let toolCallCount = 0;
  let firstPrompt: string | undefined;
  let projectPath: string | undefined;
  let gitBranch: string | undefined;
  let slug: string | undefined;
  let model: string | undefined;
  let created = '';
  let modified = '';

  for (const msg of messages) {
    // 时间范围
    if (!created || msg.timestamp < created) created = msg.timestamp;
    if (!modified || msg.timestamp > modified) modified = msg.timestamp;

    // 首次出现的元数据（取第一个非空值）
    if (!projectPath && msg.cwd) projectPath = msg.cwd;
    if (!gitBranch && msg.gitBranch) gitBranch = msg.gitBranch;
    if (!slug && msg.slug) slug = msg.slug;
    if (!model && msg.model) model = msg.model;

    // 第一条用户消息的文本作为 firstPrompt
    if (!firstPrompt && msg.type === 'user') {
      const textBlock = msg.content.find(
        (b): b is TextBlock => b.type === 'text',
      );
      if (textBlock) firstPrompt = textBlock.text.slice(0, 200);
    }

    // 累加 token 用量
    if (msg.usage) {
      totalInputTokens += msg.usage.input_tokens;
      totalOutputTokens += msg.usage.output_tokens;
    }

    // 统计 tool_use 调用次数
    for (const block of msg.content) {
      if (block.type === 'tool_use') toolCallCount++;
    }
  }

  return {
    sessionId,
    slug,
    projectPath,
    gitBranch,
    firstPrompt,
    messageCount: messages.length,
    created,
    modified,
    totalInputTokens,
    totalOutputTokens,
    toolCallCount,
    model,
  };
}

// ────────────────────────────────────────────
// normalizeContent (internal)
// ────────────────────────────────────────────
// Coerces raw message content into ContentBlock[].
// User messages may have string content → wrap as TextBlock.
// Assistant messages have array content → filter valid blocks.

function normalizeContent(
  type: EventType,
  msg: Record<string, unknown>,
): readonly ContentBlock[] {
  if (type === 'user') {
    const content = msg.content;
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    }
    if (Array.isArray(content)) {
      return content.filter(isContentBlock);
    }
    return [];
  }

  if (type === 'assistant' || type === 'system') {
    const content = msg.content;
    if (Array.isArray(content)) {
      return content.filter(isContentBlock);
    }
    return [];
  }

  return [];
}

// ────────────────────────────────────────────
// isContentBlock (internal)
// ────────────────────────────────────────────
// Type guard: validates that a raw object has a recognized block type.

function isContentBlock(block: unknown): block is ContentBlock {
  if (typeof block !== 'object' || block === null) return false;
  const b = block as Record<string, unknown>;
  return ['thinking', 'text', 'tool_use', 'tool_result'].includes(
    b.type as string,
  );
}

// ────────────────────────────────────────────
// extractUsage (internal)
// ────────────────────────────────────────────
// Pulls token usage stats from the raw message object.

function extractUsage(msg: Record<string, unknown>): TokenUsage | undefined {
  const usage = msg.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;
  return {
    input_tokens: (usage.input_tokens as number) ?? 0,
    output_tokens: (usage.output_tokens as number) ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens as
      | number
      | undefined,
    cache_read_input_tokens: usage.cache_read_input_tokens as
      | number
      | undefined,
  };
}
