import { describe, it, expect } from 'vitest';
import { parseTeamConfig, parseInbox } from '../team.js';

// ── 测试数据 ──

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

// ── parseTeamConfig ──

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

// ── parseInbox ──

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
