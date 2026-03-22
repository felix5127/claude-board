// ── Teams Page ──
// 团队管理页：团队列表 + 成员详情 + Agent 收件箱消息
// 三栏布局：左侧团队选择，中间成员卡片，右侧消息时间线

import { useState } from 'react';
import { useAPI } from '../hooks/useAPI';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { InboxTimeline } from '../components/InboxTimeline';

// ── 类型定义 ──

interface TeamMember {
  readonly agentId: string;
  readonly name: string;
  readonly agentType: string;
  readonly model: string;
  readonly color?: string;
}

interface TeamSummary {
  readonly name: string;
  readonly description: string;
  readonly createdAt: number;
  readonly leadAgentId: string;
  readonly members: readonly TeamMember[];
}

interface InboxMsg {
  readonly from: string;
  readonly text: string;
  readonly summary?: string;
  readonly timestamp: string;
  readonly color?: string;
  readonly read: boolean;
}

interface TeamDetail extends TeamSummary {
  readonly inboxes: Record<string, readonly InboxMsg[]>;
}

// ── 组件 ──

export function Teams() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { data: teams, loading, error } = useAPI<TeamSummary[]>('/teams');
  const { data: teamDetail } = useAPI<TeamDetail>(
    selectedTeam ? `/teams/${selectedTeam}` : '',
  );

  // ── 加载态 / 错误态 ──

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading teams...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  if (!teams?.length) {
    return <div className="text-gray-400 dark:text-gray-500">No teams found.</div>;
  }

  // ── 正常渲染 ──

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 团队列表 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Teams</h2>
        {teams.map((team) => (
          <button
            key={team.name}
            onClick={() => setSelectedTeam(team.name)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedTeam === team.name
                ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/20'
                : 'border-gray-200 bg-gray-50 hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
              {team.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">{team.description}</div>
            <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              {team.members.length} members
            </div>
          </button>
        ))}
      </div>

      {/* 团队详情 */}
      {teamDetail && (
        <>
          {/* 成员卡片 */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Members</h2>
            <div className="space-y-2">
              {teamDetail.members.map((member) => (
                <TeamMemberCard
                  key={member.agentId}
                  name={member.name}
                  agentType={member.agentType}
                  model={member.model}
                  color={member.color}
                />
              ))}
            </div>
          </div>

          {/* 收件箱消息 */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Inbox Messages
            </h2>
            <div className="space-y-4">
              {Object.entries(teamDetail.inboxes).map(([agent, messages]) => (
                <div key={agent}>
                  <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                    {agent}
                  </h3>
                  <InboxTimeline messages={messages} agentName={agent} />
                </div>
              ))}
              {Object.keys(teamDetail.inboxes).length === 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-600">No inbox data</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
