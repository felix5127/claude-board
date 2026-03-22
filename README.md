# Claude Board

Visual dashboard for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) conversations — view chat history, tool usage, token analytics, and agent teams in a real-time web UI.

![Claude Board](https://img.shields.io/badge/Claude_Code-Dashboard-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## Features

- **Session Browser** — Browse all Claude Code sessions grouped by time (Today / Yesterday / This Week / This Month / Older), with full-text search
- **Conversation Timeline** — View complete conversation history with user messages, assistant responses, thinking blocks, and tool calls
- **Session Metadata** — Message counts, token usage, tool call stats, duration, and model info at a glance
- **Message Search & Filter** — Search within conversations and filter by role (User / Assistant)
- **Analytics Dashboard** — Aggregated statistics, token usage charts, and model distribution
- **Agent Teams** — View multi-agent team configurations and inbox messages
- **Real-time Updates** — SSE-powered live refresh when new conversations arrive
- **Dark Mode** — System-aware theme toggle
- **CLI Quick Launch** — `claude-board` command starts the server and opens your browser

## Quick Start

```bash
# Install globally
npm install -g claude-board

# Launch (auto-opens browser)
claude-board
```

Or run from source:

```bash
git clone https://github.com/felix5127/claude-board.git
cd claude-board
npm install
npm run dev
```

Open `http://localhost:3000` (dev) or `http://localhost:3456` (production).

## How It Works

Claude Board reads conversation data from `~/.claude/projects/` (JSONL files created by Claude Code) and presents them in a searchable, real-time dashboard. No data leaves your machine — everything runs locally.

```
~/.claude/
├── projects/          ← Session JSONL files (conversations)
│   └── -Users-you/
│       ├── session-1.jsonl
│       └── session-2.jsonl
└── teams/             ← Agent team configs + inboxes
    └── my-team/
        ├── config.json
        └── inboxes/
```

## Architecture

```
claude-board/
├── client/            # React 19 + Tailwind CSS 4
│   ├── components/    # Reusable UI components
│   ├── pages/         # Sessions, Timeline, Analytics, Teams
│   ├── hooks/         # useAPI, useSSE, useTheme
│   ├── layouts/       # Sidebar navigation layout
│   └── utils/         # Time grouping utilities
├── server/            # Express 5 API server
│   ├── routes/        # REST endpoints
│   ├── parsers/       # JSONL + team config parsers
│   ├── sse.ts         # Server-Sent Events broker
│   └── watcher.ts     # File system watcher (Chokidar)
└── dist/              # Production build output
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Recharts 3, Tailwind CSS 4 |
| Backend | Express 5, Chokidar 5 (file watching) |
| Build | Vite 8, TypeScript 5.9 (strict mode) |
| Test | Vitest 4 |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions` | List sessions with pagination & search |
| `GET /api/messages/:sessionId` | Get conversation messages |
| `GET /api/teams` | List agent teams |
| `GET /api/teams/:name` | Get team detail + inboxes |
| `GET /api/events` | SSE stream for real-time updates |
| `GET /api/health` | Health check |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3456` | Server port |

## Development

```bash
npm run dev          # Start dev server (client + server)
npm run build        # Production build
npm run test:run     # Run tests
npm start            # Start production server
```

## License

[MIT](LICENSE)
