// ── Team Config & Inbox 解析器 ──
// Parses Claude Code multi-agent team configuration
// and per-agent inbox message files.

import type { TeamConfig, TeamMember, InboxMessage } from './types.js';

// ── 空值常量 ──

const EMPTY_CONFIG: TeamConfig = {
  name: '',
  description: '',
  createdAt: 0,
  leadAgentId: '',
  members: [],
};

// ── 公开 API ──

/**
 * 解析 team config.json 内容
 * 输入为 JSON 字符串，输出标准化 TeamConfig。
 * 无效输入返回空配置，不抛异常。
 */
export function parseTeamConfig(jsonContent: string): TeamConfig {
  try {
    const raw = JSON.parse(jsonContent);
    return {
      name: raw.name ?? '',
      description: raw.description ?? '',
      createdAt: raw.createdAt ?? 0,
      leadAgentId: raw.leadAgentId ?? '',
      members: Array.isArray(raw.members)
        ? raw.members.map(parseMember)
        : [],
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

/**
 * 解析 inbox JSON 数组内容
 * 输入为 InboxMessage[] 的 JSON 字符串。
 * 无效输入返回空数组，不抛异常。
 */
export function parseInbox(jsonContent: string): readonly InboxMessage[] {
  try {
    const raw = JSON.parse(jsonContent);
    if (!Array.isArray(raw)) return [];
    return raw.map(parseMessage);
  } catch {
    return [];
  }
}

// ── 内部解析 ──

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

function parseMessage(raw: Record<string, unknown>): InboxMessage {
  return {
    from: (raw.from as string) ?? '',
    text: (raw.text as string) ?? '',
    summary: raw.summary as string | undefined,
    timestamp: (raw.timestamp as string) ?? '',
    color: raw.color as string | undefined,
    read: (raw.read as boolean) ?? false,
  };
}
