# Claude Board — 设计文档

> Claude Code 对话可视化看板工具
> 日期：2026-03-22

---

## 1. 项目定位

**轻量级本地 Web 工具**，用于可视化 Claude Code 的历史对话和实时会话。
不是 Claude Code 客户端（不发送消息），纯粹的**观察 + 分析**工具。

### 差异化
| 现有工具 | 侧重 | 我们的差异 |
|----------|------|-----------|
| claude-task-viewer | Task 看板 | 完整对话 + 分析 |
| CodePilot | 桌面客户端 | 轻量 Web，专注可视化 |
| context-lens | 代理拦截 | 直接读 JSONL，零配置 |
| claude-threads | 极简 | 多视图 + 图表分析 |

---

## 2. 技术栈

| 层 | 选择 | 理由 |
|----|------|------|
| 前端框架 | React 19 + TypeScript | 组件化，生态成熟 |
| 构建工具 | Vite 6 | 快速 HMR，轻量 |
| 样式 | Tailwind CSS 4 | 暗色主题友好 |
| 图表 | Recharts | React 原生，轻量 |
| 代码高亮 | Shiki | VS Code 主题一致 |
| Markdown | react-markdown | 轻量渲染 |
| 虚拟滚动 | react-window | 大对话性能 |
| 后端 | Express 5 + TypeScript | 轻量，SSE 原生支持 |
| 文件监听 | Chokidar 4 | 成熟 FS watcher |
| 实时通信 | Server-Sent Events | 单向推送，足够且简单 |
| 测试 | Vitest + React Testing Library | 快速，Vite 原生 |

---

## 3. 数据源

Claude Code 本地存储结构：

```
~/.claude/
├── projects/{dir-encoding}/
│   ├── {sessionId}.jsonl        # 对话记录（核心数据源）
│   └── sessions-index.json     # 会话索引
├── teams/{team-name}/
│   ├── config.json             # 团队配置
│   └── inboxes/{agent}.json    # Agent 间消息
├── tasks/{team-name}/
│   └── {taskId}.json           # Task 状态
└── sessions/
    └── {pid}.json              # 活跃会话元数据
```

### JSONL 消息类型

| type | 内容 | 关键字段 |
|------|------|---------|
| `user` | 用户消息 | `message.content` |
| `assistant` | Claude 回复 | `message.content[]` (thinking/text/tool_use) |
| `tool_result` | 工具返回 | `content`, `tool_use_id` |
| `progress` | Hook 进度 | `data.type`, `data.hookEvent` |
| `file-history-snapshot` | 文件快照 | `snapshot.trackedFileBackups` |

### Assistant Content 块类型

| type | 用途 | 展示方式 |
|------|------|---------|
| `thinking` | 扩展思考 | 折叠面板，半透明背景 |
| `text` | 文本回复 | Markdown 渲染 |
| `tool_use` | 工具调用 | 卡片：工具名 + 参数 + 高亮 |

---

## 4. 系统架构

```
┌─────────────────────────────────────────────┐
│                React Client                  │
│  ┌──────┐ ┌────────┐ ┌─────────┐ ┌───────┐ │
│  │Session│ │Timeline│ │Analytics│ │ Teams │ │
│  │ List  │ │  View  │ │Dashboard│ │  View │ │
│  └───┬───┘ └───┬────┘ └────┬────┘ └───┬───┘ │
│      └─────────┴───────────┴───────────┘     │
│                    │ REST + SSE               │
└────────────────────┼─────────────────────────┘
                     │
┌────────────────────┼─────────────────────────┐
│            Express Server                     │
│  ┌─────────┐  ┌────────┐  ┌──────────────┐  │
│  │ Routes  │  │ SSE    │  │   Parsers    │  │
│  │ /api/*  │  │ Broker │  │ JSONL / Team │  │
│  └────┬────┘  └───┬────┘  └──────┬───────┘  │
│       └───────────┴──────────────┘           │
│                    │                          │
│  ┌─────────────────┴──────────────────────┐  │
│  │          Chokidar Watcher              │  │
│  │   ~/.claude/projects/**/*.jsonl        │  │
│  │   ~/.claude/teams/**/config.json       │  │
│  │   ~/.claude/sessions/*.json            │  │
│  └────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

### 数据流
1. Chokidar 监听 `~/.claude/` 下文件变化
2. 变化事件通过 SSE Broker 广播到所有连接的客户端
3. 客户端收到通知后，按需请求 REST API 获取最新数据
4. 首次加载通过 REST API 批量拉取

---

## 5. API 设计

### REST Endpoints

```
GET  /api/sessions                    # 会话列表（含摘要统计）
GET  /api/sessions/:id/messages       # 完整对话消息流
GET  /api/sessions/:id/messages?live  # 仅最新增量
GET  /api/sessions/:id/stats          # 单会话统计（token/tool）
GET  /api/stats/overview              # 跨会话聚合统计
GET  /api/teams                       # 团队列表
GET  /api/teams/:name                 # 团队详情 + inbox
GET  /api/events                      # SSE 实时事件流
```

### SSE 事件格式

```json
{
  "type": "session-update",
  "sessionId": "abc-123",
  "event": "change",
  "timestamp": "2026-03-22T10:00:00Z"
}
```

---

## 6. 视图设计

### 6.1 Sessions（会话列表）
- 卡片网格布局
- 每张卡片：slug/标题、项目路径、时间范围、消息数、总 token
- 搜索框 + 项目过滤器
- 活跃 session 脉冲指示器
- 按时间倒序排列

### 6.2 Timeline（对话时间线）— 核心视图
- 左右对话布局（用户右侧，Claude 左侧）
- Claude 回复内部：
  - Thinking 块：折叠式，紫色边框，半透明背景
  - Text：Markdown 渲染
  - Tool calls：卡片式，显示工具名 + 参数（语法高亮）+ 结果
- 时间戳显示
- react-window 虚拟滚动
- 支持搜索 + 跳转

### 6.3 Analytics（分析仪表盘）
- Token 用量折线图（input/output/cache）
- 工具调用频次柱状图
- 模型使用分布饼图
- 单 session 详情 或 跨 session 聚合 两种模式
- 关键指标卡片（总 token、总对话、平均每轮 token）

### 6.4 Teams（Agent 团队）
- 团队成员列表（颜色标记 + 模型 + 状态）
- Inbox 消息时间线
- Task 看板（Pending/InProgress/Completed）
- 成员间通信箭头图

---

## 7. 设计原则

1. **观察优先** — 只读可视化，不修改 Claude Code 状态
2. **渐进式展开** — 默认折叠 thinking/tool details，按需展开
3. **零配置启动** — `npx claude-board` 即可运行
4. **性能优先** — 虚拟滚动、增量加载、SSE 而非轮询
5. **暗色默认** — 开发者友好，支持明暗切换

---

## 8. 非目标

- 不做 Claude Code 客户端（不发消息、不执行命令）
- 不做 Electron 桌面应用
- 不做用户认证（本地工具）
- 不做数据库持久化（直接读文件系统）
