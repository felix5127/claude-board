import { describe, it, expect } from 'vitest';
import { parseJsonlLine, parseJsonlFile, extractSessionSummary } from '../jsonl.js';

// ── 测试数据 ──

const USER_LINE = JSON.stringify({
  type: 'user',
  uuid: 'uuid-1',
  parentUuid: null,
  timestamp: '2026-03-22T10:00:00.000Z',
  sessionId: 'session-1',
  cwd: '/Users/test/project',
  version: '2.1.76',
  gitBranch: 'main',
  message: { role: 'user', content: '你好' },
});

const ASSISTANT_LINE = JSON.stringify({
  type: 'assistant',
  uuid: 'uuid-2',
  parentUuid: 'uuid-1',
  timestamp: '2026-03-22T10:00:01.000Z',
  sessionId: 'session-1',
  message: {
    model: 'claude-opus-4-6',
    role: 'assistant',
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: 'Let me think...', signature: 'sig123' },
      { type: 'text', text: '你好！有什么可以帮你的？' },
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
  },
});

const TOOL_USE_LINE = JSON.stringify({
  type: 'assistant',
  uuid: 'uuid-3',
  parentUuid: 'uuid-2',
  timestamp: '2026-03-22T10:00:02.000Z',
  sessionId: 'session-1',
  message: {
    model: 'claude-opus-4-6',
    role: 'assistant',
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/test.ts' } },
    ],
    usage: { input_tokens: 200, output_tokens: 80 },
  },
});

const QUEUE_LINE = JSON.stringify({
  type: 'queue-operation',
  operation: 'enqueue',
  timestamp: '2026-03-22T10:00:00.000Z',
  sessionId: 'session-1',
});

// ── parseJsonlLine ──

describe('parseJsonlLine', () => {
  it('parses user message', () => {
    const result = parseJsonlLine(USER_LINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('user');
    expect(result!.uuid).toBe('uuid-1');
    expect(result!.content).toEqual([{ type: 'text', text: '你好' }]);
    expect(result!.sessionId).toBe('session-1');
    expect(result!.cwd).toBe('/Users/test/project');
  });

  it('parses assistant message with thinking + text', () => {
    const result = parseJsonlLine(ASSISTANT_LINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('assistant');
    expect(result!.model).toBe('claude-opus-4-6');
    expect(result!.stopReason).toBe('end_turn');
    expect(result!.content).toHaveLength(2);
    expect(result!.content[0].type).toBe('thinking');
    expect(result!.content[1].type).toBe('text');
    expect(result!.usage).toEqual({ input_tokens: 100, output_tokens: 50 });
  });

  it('parses assistant message with tool_use', () => {
    const result = parseJsonlLine(TOOL_USE_LINE);
    expect(result).not.toBeNull();
    expect(result!.content).toHaveLength(1);
    const tool = result!.content[0];
    expect(tool.type).toBe('tool_use');
    if (tool.type === 'tool_use') {
      expect(tool.name).toBe('Read');
      expect(tool.input).toEqual({ file_path: '/test.ts' });
    }
  });

  it('skips queue-operation lines', () => {
    const result = parseJsonlLine(QUEUE_LINE);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    const result = parseJsonlLine('not json');
    expect(result).toBeNull();
  });
});

// ── parseJsonlFile ──

describe('parseJsonlFile', () => {
  it('parses multiline JSONL string into messages', () => {
    const content = [USER_LINE, ASSISTANT_LINE, QUEUE_LINE, TOOL_USE_LINE].join('\n');
    const messages = parseJsonlFile(content);
    expect(messages).toHaveLength(3);
    expect(messages[0].type).toBe('user');
    expect(messages[1].type).toBe('assistant');
    expect(messages[2].type).toBe('assistant');
  });

  it('handles empty input', () => {
    expect(parseJsonlFile('')).toEqual([]);
  });
});

// ── extractSessionSummary ──

describe('extractSessionSummary', () => {
  it('extracts summary from parsed messages', () => {
    const content = [USER_LINE, ASSISTANT_LINE, TOOL_USE_LINE].join('\n');
    const messages = parseJsonlFile(content);
    const summary = extractSessionSummary('session-1', messages);

    expect(summary.sessionId).toBe('session-1');
    expect(summary.messageCount).toBe(3);
    expect(summary.totalInputTokens).toBe(300);
    expect(summary.totalOutputTokens).toBe(130);
    expect(summary.toolCallCount).toBe(1);
    expect(summary.model).toBe('claude-opus-4-6');
    expect(summary.firstPrompt).toBe('你好');
    expect(summary.projectPath).toBe('/Users/test/project');
  });
});
