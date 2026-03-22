# Claude Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local web-based dashboard that visualizes Claude Code conversation history with real-time monitoring, tool/token analytics, and team agent views.

**Architecture:** Express backend reads `~/.claude/` JSONL/JSON files, serves parsed data via REST API + SSE for real-time updates. React + Vite frontend renders five views: Sessions, Timeline, Analytics, Teams, Live. Chokidar watches file changes.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Recharts, react-markdown, Express 5, Chokidar 4, Vitest, React Testing Library

---

## Phase 1: Project Scaffolding + Server Core

### Task 1: Initialize monorepo with Vite + Express

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `server/tsconfig.json`
- Create: `client/tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `server/index.ts`
- Create: `client/index.html`
- Create: `client/main.tsx`
- Create: `client/App.tsx`

**Step 1: Initialize package.json and install dependencies**

```bash
cd /Users/felix/Desktop/code/claude-board
npm init -y
npm install express cors chokidar
npm install react react-dom react-router-dom recharts react-markdown react-window remark-gfm
npm install -D typescript @types/react @types/react-dom @types/express @types/cors
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D tsx concurrently
```

**Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 3: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "../dist/server",
    "rootDir": "."
  },
  "include": ["."]
}
```

**Step 4: Create client/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "../dist/client",
    "rootDir": "."
  },
  "include": ["."]
}
```

**Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'client',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3456',
    },
  },
  build: {
    outDir: '../dist/client',
  },
});
```

**Step 6: Create minimal server/index.ts**

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3456;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Claude Board server running on http://localhost:${PORT}`);
});
```

**Step 7: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Board</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

**Step 8: Create client/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 9: Create client/App.tsx**

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-2xl p-8">Claude Board</h1>
    </div>
  );
}
```

**Step 10: Create client/index.css**

```css
@import 'tailwindcss';
```

**Step 11: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "vite build && tsc -p server/tsconfig.json",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "type": "module"
}
```

**Step 12: Verify dev server starts**

Run: `cd /Users/felix/Desktop/code/claude-board && npm run dev:server &`
Expected: "Claude Board server running on http://localhost:3456"

Run: `curl http://localhost:3456/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with Vite + Express + Tailwind"
```

---

### Task 2: JSONL Parser with Tests (TDD)

**Files:**
- Create: `server/parsers/jsonl.ts`
- Create: `server/parsers/__tests__/jsonl.test.ts`
- Create: `server/parsers/types.ts`

**Step 1: Define TypeScript types for parsed data**

Create `server/parsers/types.ts`:

```typescript
// ── 顶层 JSONL 事件类型 ──
export type EventType =
  | 'user'
  | 'assistant'
  | 'progress'
  | 'file-history-snapshot'
  | 'queue-operation'
  | 'last-prompt'
  | 'system';

// ── Assistant content block 类型 ──
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
```

**Step 2: Write failing tests for JSONL parser**

Create `server/parsers/__tests__/jsonl.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseJsonlLine, parseJsonlFile, extractSessionSummary } from '../jsonl.js';
import type { ParsedMessage } from '../types.js';

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

describe('parseJsonlFile', () => {
  it('parses multiline JSONL string into messages', () => {
    const content = [USER_LINE, ASSISTANT_LINE, QUEUE_LINE, TOOL_USE_LINE].join('\n');
    const messages = parseJsonlFile(content);
    expect(messages).toHaveLength(3); // queue-operation skipped
    expect(messages[0].type).toBe('user');
    expect(messages[1].type).toBe('assistant');
    expect(messages[2].type).toBe('assistant');
  });

  it('handles empty input', () => {
    expect(parseJsonlFile('')).toEqual([]);
  });
});

describe('extractSessionSummary', () => {
  it('extracts summary from parsed messages', () => {
    const content = [USER_LINE, ASSISTANT_LINE, TOOL_USE_LINE].join('\n');
    const messages = parseJsonlFile(content);
    const summary = extractSessionSummary('session-1', messages);

    expect(summary.sessionId).toBe('session-1');
    expect(summary.messageCount).toBe(3);
    expect(summary.totalInputTokens).toBe(300); // 100 + 200
    expect(summary.totalOutputTokens).toBe(130); // 50 + 80
    expect(summary.toolCallCount).toBe(1);
    expect(summary.model).toBe('claude-opus-4-6');
    expect(summary.firstPrompt).toBe('你好');
    expect(summary.projectPath).toBe('/Users/test/project');
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/parsers/__tests__/jsonl.test.ts`
Expected: FAIL — module not found

**Step 4: Implement JSONL parser**

Create `server/parsers/jsonl.ts`:

```typescript
import type {
  ParsedMessage,
  ContentBlock,
  TextBlock,
  TokenUsage,
  SessionSummary,
  EventType,
} from './types.js';

// ── 跳过的事件类型（非消息数据） ──
const SKIP_TYPES = new Set(['queue-operation', 'last-prompt', 'progress', 'file-history-snapshot']);

/**
 * 解析单行 JSONL 为 ParsedMessage
 * 跳过非消息类型（queue-operation 等），返回 null
 */
export function parseJsonlLine(line: string): ParsedMessage | null {
  try {
    const raw = JSON.parse(line);
    const type = raw.type as EventType;

    if (SKIP_TYPES.has(type)) return null;

    const msg = raw.message ?? {};
    const content = normalizeContent(type, msg);
    const usage = extractUsage(msg);

    return {
      type,
      uuid: raw.uuid ?? '',
      parentUuid: raw.parentUuid ?? null,
      timestamp: raw.timestamp ?? '',
      sessionId: raw.sessionId ?? '',
      cwd: raw.cwd,
      version: raw.version,
      gitBranch: raw.gitBranch,
      slug: raw.slug,
      model: msg.model,
      stopReason: msg.stop_reason ?? null,
      content,
      usage,
      isSidechain: raw.isSidechain ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * 解析完整 JSONL 文件内容为消息数组
 */
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

/**
 * 从消息数组中提取会话摘要
 */
export function extractSessionSummary(
  sessionId: string,
  messages: readonly ParsedMessage[]
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

    // 元数据（取第一个非空值）
    if (!projectPath && msg.cwd) projectPath = msg.cwd;
    if (!gitBranch && msg.gitBranch) gitBranch = msg.gitBranch;
    if (!slug && msg.slug) slug = msg.slug;
    if (!model && msg.model) model = msg.model;

    // 第一条用户消息作为 firstPrompt
    if (!firstPrompt && msg.type === 'user') {
      const textBlock = msg.content.find((b): b is TextBlock => b.type === 'text');
      if (textBlock) firstPrompt = textBlock.text.slice(0, 200);
    }

    // Token 累计
    if (msg.usage) {
      totalInputTokens += msg.usage.input_tokens;
      totalOutputTokens += msg.usage.output_tokens;
    }

    // 工具调用计数
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

// ── 内部工具函数 ──

function normalizeContent(
  type: EventType,
  msg: Record<string, unknown>
): readonly ContentBlock[] {
  if (type === 'user') {
    const content = msg.content;
    // 用户消息 content 可能是 string 或 array
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

function isContentBlock(block: unknown): block is ContentBlock {
  if (typeof block !== 'object' || block === null) return false;
  const b = block as Record<string, unknown>;
  return ['thinking', 'text', 'tool_use', 'tool_result'].includes(b.type as string);
}

function extractUsage(msg: Record<string, unknown>): TokenUsage | undefined {
  const usage = msg.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;
  return {
    input_tokens: (usage.input_tokens as number) ?? 0,
    output_tokens: (usage.output_tokens as number) ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens as number | undefined,
    cache_read_input_tokens: usage.cache_read_input_tokens as number | undefined,
  };
}
```

**Step 5: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/__tests__/**/*.test.ts', 'client/**/__tests__/**/*.test.ts', 'client/**/__tests__/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['client/**', 'jsdom'],
    ],
  },
});
```

**Step 6: Run tests to verify they pass**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/parsers/__tests__/jsonl.test.ts`
Expected: All 8 tests PASS

**Step 7: Commit**

```bash
git add server/parsers/ vitest.config.ts
git commit -m "feat: add JSONL parser with comprehensive tests"
```

---

### Task 3: Team Config Parser with Tests (TDD)

**Files:**
- Create: `server/parsers/team.ts`
- Create: `server/parsers/__tests__/team.test.ts`

**Step 1: Write failing tests**

Create `server/parsers/__tests__/team.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseTeamConfig, parseInbox } from '../team.js';

const TEAM_CONFIG = {
  name: 'html-conversion',
  description: 'Convert HTML reports',
  createdAt: 1772974384137,
  leadAgentId: 'team-lead@html-conversion',
  leadSessionId: 'session-123',
  members: [
    {
      agentId: 'team-lead@html-conversion',
      name: 'team-lead',
      agentType: 'team-lead',
      model: 'claude-sonnet-4-6',
      joinedAt: 1772974384137,
      cwd: '/test',
      backendType: 'in-process',
    },
    {
      agentId: 'md-converter@html-conversion',
      name: 'md-converter',
      agentType: 'general-purpose',
      model: 'claude-opus-4-6',
      color: 'blue',
      prompt: 'Convert to MD',
      joinedAt: 1772974409672,
      cwd: '/test',
      backendType: 'in-process',
    },
  ],
};

const INBOX_DATA = [
  {
    from: 'md-converter',
    text: 'Task completed',
    summary: 'Done',
    timestamp: '2026-03-08T12:54:23.887Z',
    color: 'blue',
    read: true,
  },
  {
    from: 'ppt-converter',
    text: '{"type":"idle_notification","from":"ppt-converter"}',
    timestamp: '2026-03-08T12:54:26.256Z',
    color: 'green',
    read: false,
  },
];

describe('parseTeamConfig', () => {
  it('parses team config JSON', () => {
    const result = parseTeamConfig(JSON.stringify(TEAM_CONFIG));
    expect(result.name).toBe('html-conversion');
    expect(result.description).toBe('Convert HTML reports');
    expect(result.members).toHaveLength(2);
    expect(result.members[0].name).toBe('team-lead');
    expect(result.members[1].model).toBe('claude-opus-4-6');
    expect(result.members[1].color).toBe('blue');
  });

  it('returns empty members for invalid JSON', () => {
    const result = parseTeamConfig('invalid');
    expect(result.name).toBe('');
    expect(result.members).toEqual([]);
  });
});

describe('parseInbox', () => {
  it('parses inbox messages', () => {
    const result = parseInbox(JSON.stringify(INBOX_DATA));
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe('md-converter');
    expect(result[0].text).toBe('Task completed');
    expect(result[0].read).toBe(true);
    expect(result[1].read).toBe(false);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseInbox('invalid')).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/parsers/__tests__/team.test.ts`
Expected: FAIL

**Step 3: Implement team parser**

Create `server/parsers/team.ts`:

```typescript
import type { TeamConfig, TeamMember, InboxMessage } from './types.js';

export function parseTeamConfig(jsonContent: string): TeamConfig {
  try {
    const raw = JSON.parse(jsonContent);
    return {
      name: raw.name ?? '',
      description: raw.description ?? '',
      createdAt: raw.createdAt ?? 0,
      leadAgentId: raw.leadAgentId ?? '',
      members: (raw.members ?? []).map(parseMember),
    };
  } catch {
    return { name: '', description: '', createdAt: 0, leadAgentId: '', members: [] };
  }
}

export function parseInbox(jsonContent: string): readonly InboxMessage[] {
  try {
    const raw = JSON.parse(jsonContent);
    if (!Array.isArray(raw)) return [];
    return raw.map((msg) => ({
      from: msg.from ?? '',
      text: msg.text ?? '',
      summary: msg.summary,
      timestamp: msg.timestamp ?? '',
      color: msg.color,
      read: msg.read ?? false,
    }));
  } catch {
    return [];
  }
}

function parseMember(raw: Record<string, unknown>): TeamMember {
  return {
    agentId: (raw.agentId as string) ?? '',
    name: (raw.name as string) ?? '',
    agentType: (raw.agentType as string) ?? '',
    model: (raw.model as string) ?? '',
    color: raw.color as string | undefined,
    prompt: raw.prompt as string | undefined,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/parsers/__tests__/team.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add server/parsers/team.ts server/parsers/__tests__/team.test.ts
git commit -m "feat: add team config and inbox parsers with tests"
```

---

### Task 4: File Watcher + SSE Broker

**Files:**
- Create: `server/watcher.ts`
- Create: `server/sse.ts`
- Create: `server/__tests__/sse.test.ts`

**Step 1: Write failing test for SSE broker**

Create `server/__tests__/sse.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SSEBroker } from '../sse.js';

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

    // write called once for initial connection comment, not for broadcast
    expect(mockRes.write).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/__tests__/sse.test.ts`
Expected: FAIL

**Step 3: Implement SSE broker**

Create `server/sse.ts`:

```typescript
import type { Response } from 'express';

export interface SSEEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

export class SSEBroker {
  private readonly clients = new Set<Response>();

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(res: Response): void {
    this.clients.add(res);
    // SSE 初始化注释，防止某些代理缓冲
    res.write(':ok\n\n');
    res.on('close', () => this.removeClient(res));
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  broadcast(event: SSEEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.write(data);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/felix/Desktop/code/claude-board && npx vitest run server/__tests__/sse.test.ts`
Expected: All 3 tests PASS

**Step 5: Implement file watcher**

Create `server/watcher.ts`:

```typescript
import { watch } from 'chokidar';
import type { SSEBroker } from './sse.js';
import { homedir } from 'os';
import { join } from 'path';

const CLAUDE_DIR = join(homedir(), '.claude');

export function startWatcher(broker: SSEBroker): void {
  const watcher = watch(
    [
      join(CLAUDE_DIR, 'projects', '**', '*.jsonl'),
      join(CLAUDE_DIR, 'teams', '**', 'config.json'),
      join(CLAUDE_DIR, 'teams', '**', 'inboxes', '*.json'),
      join(CLAUDE_DIR, 'sessions', '*.json'),
      join(CLAUDE_DIR, 'tasks', '**', '*.json'),
    ],
    {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    }
  );

  watcher.on('change', (path) => {
    const sessionId = extractSessionId(path);
    broker.broadcast({
      type: 'file-change',
      path,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('add', (path) => {
    broker.broadcast({
      type: 'file-add',
      path,
      timestamp: new Date().toISOString(),
    });
  });

  console.log(`Watching ${CLAUDE_DIR} for changes...`);
}

function extractSessionId(filePath: string): string | null {
  // 从 JSONL 文件名提取 sessionId: /{sessionId}.jsonl
  const match = filePath.match(/([0-9a-f-]{36})\.jsonl$/);
  return match?.[1] ?? null;
}
```

**Step 6: Commit**

```bash
git add server/sse.ts server/watcher.ts server/__tests__/sse.test.ts
git commit -m "feat: add SSE broker and file watcher"
```

---

### Task 5: REST API Routes

**Files:**
- Create: `server/routes/sessions.ts`
- Create: `server/routes/messages.ts`
- Create: `server/routes/stats.ts`
- Create: `server/routes/teams.ts`
- Create: `server/routes/events.ts`
- Modify: `server/index.ts`

**Step 1: Implement sessions route**

Create `server/routes/sessions.ts`:

```typescript
import { Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseJsonlFile, extractSessionSummary } from '../parsers/jsonl.js';

const router = Router();
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

router.get('/', async (_req, res) => {
  try {
    const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);
    const sessions: Array<Record<string, unknown>> = [];

    for (const dir of projectDirs) {
      const dirPath = join(PROJECTS_DIR, dir);
      const dirStat = await stat(dirPath).catch(() => null);
      if (!dirStat?.isDirectory()) continue;

      const files = await readdir(dirPath).catch(() => []);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      for (const file of jsonlFiles) {
        const filePath = join(dirPath, file);
        const sessionId = file.replace('.jsonl', '');
        const fileStat = await stat(filePath).catch(() => null);
        if (!fileStat) continue;

        // 读取前 64KB 用于快速摘要提取
        const content = await readFile(filePath, 'utf-8').catch(() => '');
        const messages = parseJsonlFile(content);
        const summary = extractSessionSummary(sessionId, messages);

        sessions.push({
          ...summary,
          projectDir: dir,
          fileSize: fileStat.size,
        });
      }
    }

    // 按修改时间倒序
    sessions.sort((a, b) =>
      String(b.modified).localeCompare(String(a.modified))
    );

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

export default router;
```

**Step 2: Implement messages route**

Create `server/routes/messages.ts`:

```typescript
import { Router } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseJsonlFile } from '../parsers/jsonl.js';

const router = Router();
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = await findSessionFile(sessionId);
    if (!filePath) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const content = await readFile(filePath, 'utf-8');
    const messages = parseJsonlFile(content);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read session' });
  }
});

async function findSessionFile(sessionId: string): Promise<string | null> {
  const projectDirs = await readdir(PROJECTS_DIR).catch(() => []);
  for (const dir of projectDirs) {
    const filePath = join(PROJECTS_DIR, dir, `${sessionId}.jsonl`);
    try {
      await readFile(filePath, { flag: 'r' });
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}

export default router;
```

**Step 3: Implement stats route**

Create `server/routes/stats.ts`:

```typescript
import { Router } from 'express';
import { readFile } from 'fs/promises';
import { parseJsonlFile, extractSessionSummary } from '../parsers/jsonl.js';
import type { ParsedMessage } from '../parsers/types.js';

const router = Router();

// 复用 messages 路由的 findSessionFile 逻辑
// 后续重构可提取为共享服务
import messagesRouter from './messages.js';

router.get('/:sessionId', async (req, res) => {
  // 转发到专用统计端点实现
  res.status(501).json({ error: 'Not yet implemented — use /api/sessions for summary stats' });
});

router.get('/overview', async (_req, res) => {
  res.status(501).json({ error: 'Not yet implemented' });
});

export default router;
```

**Step 4: Implement teams route**

Create `server/routes/teams.ts`:

```typescript
import { Router } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parseTeamConfig, parseInbox } from '../parsers/team.js';

const router = Router();
const TEAMS_DIR = join(homedir(), '.claude', 'teams');

router.get('/', async (_req, res) => {
  try {
    const teamDirs = await readdir(TEAMS_DIR).catch(() => []);
    const teams = [];

    for (const dir of teamDirs) {
      const configPath = join(TEAMS_DIR, dir, 'config.json');
      const content = await readFile(configPath, 'utf-8').catch(() => '');
      if (!content) continue;
      teams.push(parseTeamConfig(content));
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

router.get('/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const configPath = join(TEAMS_DIR, name, 'config.json');
    const content = await readFile(configPath, 'utf-8').catch(() => '');
    if (!content) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const config = parseTeamConfig(content);

    // 读取所有 inbox
    const inboxDir = join(TEAMS_DIR, name, 'inboxes');
    const inboxFiles = await readdir(inboxDir).catch(() => []);
    const inboxes: Record<string, unknown> = {};

    for (const file of inboxFiles) {
      if (!file.endsWith('.json')) continue;
      const agentName = file.replace('.json', '');
      const inboxContent = await readFile(join(inboxDir, file), 'utf-8').catch(() => '[]');
      inboxes[agentName] = parseInbox(inboxContent);
    }

    res.json({ ...config, inboxes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read team' });
  }
});

export default router;
```

**Step 5: Implement SSE events route**

Create `server/routes/events.ts`:

```typescript
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
```

**Step 6: Wire everything in server/index.ts**

Update `server/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { SSEBroker } from './sse.js';
import { startWatcher } from './watcher.js';
import sessionsRouter from './routes/sessions.js';
import messagesRouter from './routes/messages.js';
import statsRouter from './routes/stats.js';
import teamsRouter from './routes/teams.js';
import { createEventsRouter } from './routes/events.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3456;
const broker = new SSEBroker();

app.use(cors());
app.use(express.json());

// ── API 路由 ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', clients: broker.clientCount, timestamp: new Date().toISOString() });
});
app.use('/api/sessions', sessionsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/events', createEventsRouter(broker));

// ── 启动 ──
app.listen(PORT, () => {
  console.log(`Claude Board server running on http://localhost:${PORT}`);
  startWatcher(broker);
});
```

**Step 7: Verify server starts and APIs work**

Run: `cd /Users/felix/Desktop/code/claude-board && npm run dev:server &`
Run: `curl http://localhost:3456/api/sessions | python3 -m json.tool | head -20`
Run: `curl http://localhost:3456/api/teams | python3 -m json.tool`

**Step 8: Commit**

```bash
git add server/
git commit -m "feat: add REST API routes for sessions, messages, teams, and SSE events"
```

---

## Phase 2: React Frontend — Core Layout + Sessions

### Task 6: Main Layout with Tab Navigation + Theme Toggle

**Files:**
- Create: `client/layouts/MainLayout.tsx`
- Create: `client/hooks/useTheme.ts`
- Create: `client/components/ThemeToggle.tsx`
- Modify: `client/App.tsx`

**Step 1: Implement theme hook**

Create `client/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('claude-board-theme') as Theme) ?? 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('claude-board-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme } as const;
}
```

**Step 2: Implement theme toggle component**

Create `client/components/ThemeToggle.tsx`:

```tsx
interface ThemeToggleProps {
  readonly theme: 'dark' | 'light';
  readonly onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

**Step 3: Implement main layout**

Create `client/layouts/MainLayout.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

const TABS = [
  { path: '/', label: 'Sessions' },
  { path: '/timeline', label: 'Timeline' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/teams', label: 'Teams' },
] as const;

export function MainLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 dark:bg-gray-950 dark:text-gray-100
                    light:bg-white light:text-gray-900">
      {/* ── 顶部导航栏 ── */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-semibold tracking-tight">Claude Board</h1>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {/* ── 内容区域 ── */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 4: Update App.tsx with routing**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';

function SessionsPage() {
  return <div className="text-gray-400">Sessions — coming soon</div>;
}

function TimelinePage() {
  return <div className="text-gray-400">Timeline — coming soon</div>;
}

function AnalyticsPage() {
  return <div className="text-gray-400">Analytics — coming soon</div>;
}

function TeamsPage() {
  return <div className="text-gray-400">Teams — coming soon</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<SessionsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="timeline/:sessionId" element={<TimelinePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="teams" element={<TeamsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 5: Verify UI loads**

Run: `cd /Users/felix/Desktop/code/claude-board && npm run dev`
Open: `http://localhost:3000`
Expected: Dark page with "Claude Board" header, 4 tabs, theme toggle

**Step 6: Commit**

```bash
git add client/
git commit -m "feat: add main layout with tab navigation and theme toggle"
```

---

### Task 7: Sessions List Page

**Files:**
- Create: `client/hooks/useAPI.ts`
- Create: `client/hooks/useSSE.ts`
- Create: `client/pages/Sessions.tsx`
- Create: `client/components/SessionCard.tsx`
- Modify: `client/App.tsx`

**Step 1: Implement API hook**

Create `client/hooks/useAPI.ts`:

```typescript
import { useState, useEffect } from 'react';

const API_BASE = '/api';

export function useAPI<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [path]);

  return { data, loading, error, refetch } as const;
}
```

**Step 2: Implement SSE hook**

Create `client/hooks/useSSE.ts`:

```typescript
import { useEffect, useRef } from 'react';

interface SSEOptions {
  readonly onMessage: (event: Record<string, unknown>) => void;
  readonly enabled?: boolean;
}

export function useSSE({ onMessage, enabled = true }: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource('/api/events');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // 忽略无效 JSON
      }
    };

    es.onerror = () => {
      // EventSource 会自动重连
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [enabled]);
}
```

**Step 3: Implement SessionCard component**

Create `client/components/SessionCard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';

interface SessionCardProps {
  readonly sessionId: string;
  readonly slug?: string;
  readonly projectPath?: string;
  readonly firstPrompt?: string;
  readonly messageCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
  readonly created: string;
  readonly modified: string;
}

export function SessionCard(props: SessionCardProps) {
  const navigate = useNavigate();
  const totalTokens = props.totalInputTokens + props.totalOutputTokens;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const shortProject = props.projectPath
    ? props.projectPath.replace(/^\/Users\/[^/]+\//, '~/')
    : undefined;

  return (
    <button
      onClick={() => navigate(`/timeline/${props.sessionId}`)}
      className="w-full text-left p-4 rounded-xl border border-gray-800 hover:border-gray-600
                 bg-gray-900/50 hover:bg-gray-800/50 transition-all group"
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200 truncate">
          {props.slug ?? props.sessionId.slice(0, 8)}
        </span>
        <span className="text-xs text-gray-500">{formatTime(props.modified)}</span>
      </div>

      {/* 项目路径 */}
      {shortProject && (
        <div className="text-xs text-gray-500 mb-2 truncate font-mono">{shortProject}</div>
      )}

      {/* 首条消息预览 */}
      {props.firstPrompt && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{props.firstPrompt}</p>
      )}

      {/* 统计指标 */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>{props.messageCount} msgs</span>
        <span>{formatTokens(totalTokens)} tokens</span>
        <span>{props.toolCallCount} tools</span>
        {props.model && (
          <span className="text-gray-600">{props.model.replace('claude-', '')}</span>
        )}
      </div>
    </button>
  );
}
```

**Step 4: Implement Sessions page**

Create `client/pages/Sessions.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { useAPI } from '../hooks/useAPI';
import { useSSE } from '../hooks/useSSE';
import { SessionCard } from '../components/SessionCard';

interface SessionData {
  readonly sessionId: string;
  readonly slug?: string;
  readonly projectPath?: string;
  readonly firstPrompt?: string;
  readonly messageCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
  readonly created: string;
  readonly modified: string;
}

export function Sessions() {
  const [search, setSearch] = useState('');
  const { data: sessions, loading, error, refetch } = useAPI<SessionData[]>('/sessions');

  // SSE 实时刷新
  useSSE({
    onMessage: useCallback(() => {
      refetch();
    }, [refetch]),
  });

  const filtered = sessions?.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.sessionId.toLowerCase().includes(q) ||
      s.slug?.toLowerCase().includes(q) ||
      s.projectPath?.toLowerCase().includes(q) ||
      s.firstPrompt?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="text-gray-500">Loading sessions...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div>
      {/* 搜索栏 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg bg-gray-900 border border-gray-700
                     text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 统计摘要 */}
      <div className="mb-4 text-sm text-gray-500">
        {filtered?.length ?? 0} sessions found
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered?.map((session) => (
          <SessionCard key={session.sessionId} {...session} />
        ))}
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx to use Sessions page**

Replace the placeholder `SessionsPage` with import from `./pages/Sessions`.

**Step 6: Verify sessions page loads with real data**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Grid of session cards with real data from `~/.claude/`

**Step 7: Commit**

```bash
git add client/
git commit -m "feat: add Sessions list page with search, SSE refresh, and session cards"
```

---

## Phase 3: Timeline View (Core)

### Task 8: Timeline Page with Message Rendering

**Files:**
- Create: `client/pages/Timeline.tsx`
- Create: `client/components/MessageBubble.tsx`
- Create: `client/components/ThinkingBlock.tsx`
- Create: `client/components/ToolCallCard.tsx`
- Modify: `client/App.tsx`

**Step 1: Implement ThinkingBlock component**

Create `client/components/ThinkingBlock.tsx`:

```tsx
import { useState } from 'react';

interface ThinkingBlockProps {
  readonly thinking: string;
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-purple-800/30 bg-purple-950/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-purple-400
                   hover:bg-purple-900/20 transition-colors"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span>Thinking</span>
        <span className="text-purple-600">({thinking.length} chars)</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-sm text-purple-300/80 whitespace-pre-wrap border-t border-purple-800/20 max-h-96 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Implement ToolCallCard component**

Create `client/components/ToolCallCard.tsx`:

```tsx
import { useState } from 'react';

interface ToolCallCardProps {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly id: string;
}

export function ToolCallCard({ name, input, id }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  // 工具名称颜色映射
  const toolColor: Record<string, string> = {
    Read: 'text-green-400 border-green-800/30 bg-green-950/20',
    Write: 'text-yellow-400 border-yellow-800/30 bg-yellow-950/20',
    Edit: 'text-orange-400 border-orange-800/30 bg-orange-950/20',
    Bash: 'text-red-400 border-red-800/30 bg-red-950/20',
    Glob: 'text-cyan-400 border-cyan-800/30 bg-cyan-950/20',
    Grep: 'text-cyan-400 border-cyan-800/30 bg-cyan-950/20',
    Agent: 'text-blue-400 border-blue-800/30 bg-blue-950/20',
  };

  const colorClass = toolColor[name] ?? 'text-gray-400 border-gray-800/30 bg-gray-950/20';

  return (
    <div className={`my-2 rounded-lg border ${colorClass} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-mono font-medium">{name}</span>
        <span className="text-gray-500 truncate">
          {summarizeInput(name, input)}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs font-mono text-gray-300 border-t border-current/10 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function summarizeInput(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read': return String(input.file_path ?? '');
    case 'Write': return String(input.file_path ?? '');
    case 'Edit': return String(input.file_path ?? '');
    case 'Bash': return String(input.command ?? '').slice(0, 60);
    case 'Glob': return String(input.pattern ?? '');
    case 'Grep': return String(input.pattern ?? '');
    case 'Agent': return String(input.description ?? '');
    default: return Object.keys(input).join(', ');
  }
}
```

**Step 3: Implement MessageBubble component**

Create `client/components/MessageBubble.tsx`:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallCard } from './ToolCallCard';

interface ContentBlock {
  readonly type: string;
  readonly text?: string;
  readonly thinking?: string;
  readonly name?: string;
  readonly id?: string;
  readonly input?: Record<string, unknown>;
}

interface MessageBubbleProps {
  readonly type: 'user' | 'assistant' | 'system';
  readonly content: readonly ContentBlock[];
  readonly timestamp: string;
  readonly model?: string;
}

export function MessageBubble({ type, content, timestamp, model }: MessageBubbleProps) {
  const isUser = type === 'user';
  const time = new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl ${isUser ? 'ml-16' : 'mr-16'}`}>
        {/* 元信息 */}
        <div className={`flex items-center gap-2 mb-1 text-xs text-gray-500 ${isUser ? 'justify-end' : ''}`}>
          <span>{isUser ? 'User' : model?.replace('claude-', '') ?? 'Claude'}</span>
          <span>{time}</span>
        </div>

        {/* 消息体 */}
        <div
          className={`rounded-xl px-4 py-3 ${
            isUser
              ? 'bg-blue-600/20 border border-blue-800/30'
              : 'bg-gray-800/50 border border-gray-700/30'
          }`}
        >
          {content.map((block, i) => (
            <ContentBlockRenderer key={i} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentBlockRenderer({ block }: { readonly block: ContentBlock }) {
  switch (block.type) {
    case 'thinking':
      return <ThinkingBlock thinking={block.thinking ?? ''} />;
    case 'text':
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text ?? ''}</ReactMarkdown>
        </div>
      );
    case 'tool_use':
      return (
        <ToolCallCard
          name={block.name ?? 'Unknown'}
          input={block.input ?? {}}
          id={block.id ?? ''}
        />
      );
    case 'tool_result':
      return (
        <div className="my-2 text-xs text-gray-500 bg-gray-900/50 rounded p-2 max-h-48 overflow-y-auto font-mono">
          {block.text?.slice(0, 500) ?? '(no output)'}
        </div>
      );
    default:
      return null;
  }
}
```

**Step 4: Implement Timeline page**

Create `client/pages/Timeline.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useAPI } from '../hooks/useAPI';
import { useSSE } from '../hooks/useSSE';
import { MessageBubble } from '../components/MessageBubble';

interface Message {
  readonly type: string;
  readonly uuid: string;
  readonly content: readonly Record<string, unknown>[];
  readonly timestamp: string;
  readonly model?: string;
  readonly sessionId: string;
}

export function Timeline() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: messages, loading, error, refetch } = useAPI<Message[]>(
    sessionId ? `/messages/${sessionId}` : ''
  );

  // 实时监听当前 session 的变化
  useSSE({
    onMessage: useCallback(
      (event: Record<string, unknown>) => {
        if (event.sessionId === sessionId || event.type === 'file-change') {
          refetch();
        }
      },
      [sessionId, refetch]
    ),
    enabled: !!sessionId,
  });

  if (!sessionId) {
    return (
      <div className="text-gray-500 text-center mt-20">
        Select a session from the Sessions tab to view its timeline.
      </div>
    );
  }

  if (loading) return <div className="text-gray-500">Loading conversation...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  const displayMessages = messages?.filter((m) => m.type === 'user' || m.type === 'assistant') ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 text-sm text-gray-500">
        {displayMessages.length} messages in session {sessionId.slice(0, 8)}...
      </div>

      <div className="space-y-2">
        {displayMessages.map((msg) => (
          <MessageBubble
            key={msg.uuid}
            type={msg.type as 'user' | 'assistant'}
            content={msg.content}
            timestamp={msg.timestamp}
            model={msg.model}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx with Timeline import**

Replace placeholder with `import { Timeline } from './pages/Timeline'`.

**Step 6: Verify timeline renders real conversations**

Open: `http://localhost:3000`
Click a session card → should navigate to `/timeline/{sessionId}` with rendered messages

**Step 7: Commit**

```bash
git add client/
git commit -m "feat: add Timeline view with message bubbles, thinking blocks, and tool call cards"
```

---

## Phase 4: Analytics Dashboard

### Task 9: Token + Tool Analytics Charts

**Files:**
- Create: `client/pages/Analytics.tsx`
- Create: `client/components/TokenChart.tsx`
- Create: `client/components/ToolDistribution.tsx`
- Create: `client/components/StatCard.tsx`
- Modify: `client/App.tsx`

**Step 1: Implement StatCard component**

Create `client/components/StatCard.tsx`:

```tsx
interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
```

**Step 2: Implement TokenChart**

Create `client/components/TokenChart.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TokenData {
  readonly name: string;
  readonly input: number;
  readonly output: number;
}

interface TokenChartProps {
  readonly data: readonly TokenData[];
}

export function TokenChart({ data }: TokenChartProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Token Usage by Session</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={[...data]}>
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />
          <Bar dataKey="input" fill="#3b82f6" name="Input" radius={[2, 2, 0, 0]} />
          <Bar dataKey="output" fill="#8b5cf6" name="Output" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3: Implement ToolDistribution**

Create `client/components/ToolDistribution.tsx`:

```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ToolData {
  readonly name: string;
  readonly count: number;
}

interface ToolDistributionProps {
  readonly data: readonly ToolData[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#6366f1'];

export function ToolDistribution({ data }: ToolDistributionProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Tool Usage Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={[...data]}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4: Implement Analytics page**

Create `client/pages/Analytics.tsx` — computes stats client-side from sessions data:

```tsx
import { useAPI } from '../hooks/useAPI';
import { StatCard } from '../components/StatCard';
import { TokenChart } from '../components/TokenChart';
import { ToolDistribution } from '../components/ToolDistribution';

interface SessionData {
  readonly sessionId: string;
  readonly slug?: string;
  readonly messageCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly toolCallCount: number;
  readonly model?: string;
  readonly modified: string;
}

export function Analytics() {
  const { data: sessions, loading, error } = useAPI<SessionData[]>('/sessions');

  if (loading) return <div className="text-gray-500">Loading analytics...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!sessions?.length) return <div className="text-gray-500">No session data found.</div>;

  const totalTokens = sessions.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0);
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const totalTools = sessions.reduce((sum, s) => sum + s.toolCallCount, 0);

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  // Token 柱状图数据（最近 20 个 session）
  const tokenChartData = sessions.slice(0, 20).map((s) => ({
    name: s.slug?.slice(0, 15) ?? s.sessionId.slice(0, 8),
    input: s.totalInputTokens,
    output: s.totalOutputTokens,
  }));

  // 模型分布
  const modelCounts = new Map<string, number>();
  for (const s of sessions) {
    const m = s.model ?? 'unknown';
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }
  const modelData = [...modelCounts.entries()].map(([name, count]) => ({ name, count }));

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Sessions" value={String(sessions.length)} />
        <StatCard label="Total Messages" value={formatNum(totalMessages)} />
        <StatCard label="Total Tokens" value={formatNum(totalTokens)} />
        <StatCard label="Tool Calls" value={formatNum(totalTools)} />
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenChart data={tokenChartData} />
        <ToolDistribution data={modelData} />
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx**

Import and use `Analytics` component.

**Step 6: Verify analytics page renders**

Open: `http://localhost:3000/analytics`
Expected: Stat cards + bar chart + pie chart with real data

**Step 7: Commit**

```bash
git add client/
git commit -m "feat: add Analytics dashboard with token charts and model distribution"
```

---

## Phase 5: Teams View

### Task 10: Teams Page with Agent Inbox

**Files:**
- Create: `client/pages/Teams.tsx`
- Create: `client/components/TeamMemberCard.tsx`
- Create: `client/components/InboxTimeline.tsx`
- Modify: `client/App.tsx`

**Step 1: Implement TeamMemberCard**

Create `client/components/TeamMemberCard.tsx`:

```tsx
interface TeamMemberCardProps {
  readonly name: string;
  readonly agentType: string;
  readonly model: string;
  readonly color?: string;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-500/10',
  green: 'border-green-500 bg-green-500/10',
  red: 'border-red-500 bg-red-500/10',
  yellow: 'border-yellow-500 bg-yellow-500/10',
  purple: 'border-purple-500 bg-purple-500/10',
};

export function TeamMemberCard({ name, agentType, model, color }: TeamMemberCardProps) {
  const colorClass = COLOR_MAP[color ?? ''] ?? 'border-gray-600 bg-gray-800/50';

  return (
    <div className={`p-3 rounded-lg border ${colorClass}`}>
      <div className="font-medium text-sm text-gray-200">{name}</div>
      <div className="text-xs text-gray-500 mt-1">{agentType}</div>
      <div className="text-xs text-gray-600 mt-1 font-mono">{model.replace('claude-', '')}</div>
    </div>
  );
}
```

**Step 2: Implement InboxTimeline**

Create `client/components/InboxTimeline.tsx`:

```tsx
interface InboxMessage {
  readonly from: string;
  readonly text: string;
  readonly timestamp: string;
  readonly color?: string;
  readonly read: boolean;
}

interface InboxTimelineProps {
  readonly messages: readonly InboxMessage[];
  readonly agentName: string;
}

export function InboxTimeline({ messages, agentName }: InboxTimelineProps) {
  if (!messages.length) {
    return <div className="text-xs text-gray-600">No messages</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((msg, i) => {
        const isStructured = msg.text.startsWith('{');
        let displayText = msg.text;
        let msgType = '';

        if (isStructured) {
          try {
            const parsed = JSON.parse(msg.text);
            msgType = parsed.type ?? '';
            displayText = parsed.subject ?? parsed.idleReason ?? msgType;
          } catch {
            // 保持原文
          }
        }

        return (
          <div
            key={i}
            className={`px-3 py-2 rounded-lg text-xs border ${
              msg.read ? 'border-gray-800 bg-gray-900/30' : 'border-blue-800/50 bg-blue-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-300">{msg.from} → {agentName}</span>
              <span className="text-gray-600">
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msgType && (
              <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-400 mb-1">
                {msgType}
              </span>
            )}
            <p className="text-gray-400 break-words">{displayText.slice(0, 200)}</p>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Implement Teams page**

Create `client/pages/Teams.tsx`:

```tsx
import { useState } from 'react';
import { useAPI } from '../hooks/useAPI';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { InboxTimeline } from '../components/InboxTimeline';

interface TeamSummary {
  readonly name: string;
  readonly description: string;
  readonly members: readonly { name: string; agentType: string; model: string; color?: string }[];
}

interface TeamDetail extends TeamSummary {
  readonly inboxes: Record<string, readonly { from: string; text: string; timestamp: string; color?: string; read: boolean }[]>;
}

export function Teams() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { data: teams, loading, error } = useAPI<TeamSummary[]>('/teams');
  const { data: teamDetail } = useAPI<TeamDetail>(
    selectedTeam ? `/teams/${selectedTeam}` : ''
  );

  if (loading) return <div className="text-gray-500">Loading teams...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!teams?.length) return <div className="text-gray-500">No teams found.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 团队列表 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-400 mb-2">Teams</h2>
        {teams.map((team) => (
          <button
            key={team.name}
            onClick={() => setSelectedTeam(team.name)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedTeam === team.name
                ? 'border-blue-600 bg-blue-950/20'
                : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-sm">{team.name}</div>
            <div className="text-xs text-gray-500 mt-1">{team.description}</div>
            <div className="text-xs text-gray-600 mt-1">{team.members.length} members</div>
          </button>
        ))}
      </div>

      {/* 团队详情 */}
      {teamDetail && (
        <>
          {/* 成员 */}
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-2">Members</h2>
            <div className="space-y-2">
              {teamDetail.members.map((member) => (
                <TeamMemberCard key={member.name} {...member} />
              ))}
            </div>
          </div>

          {/* Inbox 消息 */}
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-2">Inbox Messages</h2>
            <div className="space-y-4">
              {Object.entries(teamDetail.inboxes).map(([agent, messages]) => (
                <div key={agent}>
                  <h3 className="text-xs font-medium text-gray-500 mb-1">{agent}</h3>
                  <InboxTimeline messages={messages} agentName={agent} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 4: Update App.tsx**

Import `Teams` component.

**Step 5: Verify teams page renders**

Open: `http://localhost:3000/teams`
Expected: Team list with members and inbox messages

**Step 6: Commit**

```bash
git add client/
git commit -m "feat: add Teams view with member cards and inbox timeline"
```

---

## Phase 6: Polish + Production Ready

### Task 11: Performance Optimization

**Files:**
- Modify: `server/routes/sessions.ts` — Add pagination + caching
- Modify: `client/pages/Timeline.tsx` — Add virtual scrolling with react-window

**Step 1: Add pagination to sessions API**

Add query params `?limit=50&offset=0` support.

**Step 2: Add virtual scrolling to Timeline**

Use `FixedSizeList` from react-window for large conversations.

**Step 3: Add server-side JSONL caching**

Cache parsed sessions in memory with TTL (invalidated by watcher).

**Step 4: Commit**

```bash
git commit -m "perf: add pagination, virtual scrolling, and server-side caching"
```

---

### Task 12: Light Theme + Final Polish

**Files:**
- Modify: `client/index.css` — Add light theme Tailwind classes
- Modify: `client/layouts/MainLayout.tsx` — Fix light mode colors
- Create: `client/components/EmptyState.tsx`

**Step 1: Add proper light/dark theme support via Tailwind dark mode**

**Step 2: Add empty state components for each page**

**Step 3: Add loading skeletons**

**Step 4: Final visual polish pass**

**Step 5: Commit**

```bash
git commit -m "feat: add light theme support and UI polish"
```

---

### Task 13: Package for npx distribution

**Files:**
- Modify: `package.json` — Add bin entry
- Create: `bin/cli.ts` — CLI entry point
- Modify: `server/index.ts` — Serve built frontend in production

**Step 1: Create CLI entry**

```typescript
#!/usr/bin/env node
// bin/cli.ts — 启动 claude-board 服务
import '../server/index.js';
```

**Step 2: Update package.json**

```json
{
  "name": "claude-board",
  "bin": { "claude-board": "./dist/bin/cli.js" },
  "files": ["dist/"]
}
```

**Step 3: Build and test `npx claude-board`**

**Step 4: Commit**

```bash
git commit -m "feat: add CLI entry for npx claude-board distribution"
```

---

## Execution Order Summary

| Phase | Tasks | 预估 |
|-------|-------|------|
| 1. Scaffolding + Server | Task 1-5 | 核心后端 |
| 2. Frontend Core | Task 6-7 | 布局 + Sessions |
| 3. Timeline | Task 8 | 核心视图 |
| 4. Analytics | Task 9 | 图表仪表盘 |
| 5. Teams | Task 10 | Agent 视图 |
| 6. Polish | Task 11-13 | 性能 + 打包 |

**Total: 13 tasks, TDD throughout**
