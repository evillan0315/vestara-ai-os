# Vestara AI OS — Applications

> Built-in applications that make the AI workstation complete.
> No need to install anything. Everything is ready.

---

## Application Overview

| App | Purpose | Priority |
|---|---|---|
| Vestara Assistant | Voice, chat, vision, memory, planning | P0 |
| Vestara Studio | AI workspace, prompt engineering, automation | P0 |
| Vestara Projects | Kanban, tasks, roadmaps, blueprints | P0 |
| Vestara Knowledge | Document indexing, semantic search, RAG | P0 |
| Vestara Terminal | AI-powered terminal with suggestions | P1 |
| Vestara Developer | Monaco, Git, Docker, Kubernetes, OpenCode | P1 |
| Vestara Marketplace | AI plugins, agents, templates, skills | P2 |

---

## Vestara Assistant

The primary AI interface. Think ChatGPT, but local-first and memory-aware.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Assistant                          [New Chat] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Conversations                                        │
│ ├── Today                                           │
│ │   ├── "Research AI market trends"                  │
│ │   ├── "Help me refactor auth module"               │
│ │   └── "Summarize Q3 report"                        │
│ ├── Yesterday                                        │
│ │   └── "Draft investor email"                       │
│ └── Last Week                                         │
│     └── "Architecture review"                        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │                                                  │ │
│ │  What can I help you with, Eddie?                │ │
│ │                                                  │ │
│ │  ┌─────────┐ ┌──────────┐ ┌───────────────┐     │ │
│ │  │  Chat   │ │  Voice   │ │    Vision     │     │ │
│ │  └─────────┘ └──────────┘ └───────────────┘     │ │
│ │                                                  │ │
│ │  I know you're working on Vestara AI OS.         │ │
│ │  Want me to continue the architecture review?    │ │
│ │                                                  │ │
│ │  ┌──────────────────────────────────────────┐    │ │
│ │  │ Type a message...                  [Send]│    │ │
│ │  └──────────────────────────────────────────┘    │ │
│ │                                                  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Model: Claude Opus 4  │  Memory: Active  │  Context: 128K │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **Multi-model support** — Switch between local and cloud models mid-conversation
- **Voice input/output** — Speech-to-text and text-to-speech
- **Vision** — Analyze images, screenshots, documents
- **Memory-aware** — Remembers past conversations, user preferences
- **Context-aware** — Knows about your projects, files, and active tasks
- **Tool use** — Can execute terminal commands, search files, manage projects
- **Streaming** — Real-time response streaming
- **Markdown rendering** — Rich text, code blocks, tables, math
- **Code execution** — Run code snippets directly in conversation

### Architecture

```
vestara-assistant/
├── src/
│   ├── components/
│   │   ├── ConversationList/
│   │   ├── ChatInterface/
│   │   ├── MessageBubble/
│   │   ├── CodeBlock/
│   │   ├── ToolPanel/
│   │   └── ModelSelector/
│   ├── hooks/
│   │   ├── useConversation.ts
│   │   ├── useStreaming.ts
│   │   ├── useVoice.ts
│   │   └── useMemory.ts
│   ├── services/
│   │   ├── conversation.ts
│   │   ├── message.ts
│   │   └── model.ts
│   └── types/
│       └── assistant.ts
├── package.json
└── tsconfig.json
```

---

## Vestara Studio

AI workspace for prompt engineering and automation building.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Studio                        [New Project]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────┐ ┌──────────────────────────────────────┐│
│ │          │ │                                      ││
│ │ Prompts  │ │  Prompt Editor                       ││
│ │          │ │  ┌────────────────────────────────┐  ││
│ │ ├── New  │ │  │ You are a research assistant... │  ││
│ │ │  PRD   │ │  │                                  │  ││
│ │ ├── Code │ │  │ {{context}}                      │  ││
│ │ │  Review│ │  │                                  │  ││
│ │ └── Docs │ │  │ Please analyze: {{input}}        │  ││
│ │          │ │  └────────────────────────────────┘  ││
│ │ Workflows│ │                                      ││
│ │          │ │  Variables:                          ││
│ │ ├── Daily│ │  ├── context: Knowledge search      ││
│ │ │  Report│ │  └── input: User query              ││
│ │ └── Code │ │                                      ││
│ │   Gen    │ │  [Test] [Save] [Deploy]              ││
│ │          │ │                                      ││
│ └──────────┘ └──────────────────────────────────────┘│
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **Prompt library** — Organize and version prompts
- **Variable system** — Dynamic prompt templates
- **A/B testing** — Compare prompt variants
- **Workflow builder** — Visual multi-step AI pipelines
- **Analytics** — Track token usage, costs, quality scores
- **Export** — Share prompts and workflows

---

## Vestara Projects

Project management built for AI-assisted development.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Projects                    [+ New Project]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Vestara AI OS                                        │
│ ├── Roadmap                                         │
│ │   ├── Stage 1: Vestara Layer         ████████░░ 80%│
│ │   ├── Stage 2: Distribution          ███░░░░░░ 30%│
│ │   ├── Stage 3: Custom ISO            ░░░░░░░░░  0%│
│ │   └── Stage 4: Immutable OS          ░░░░░░░░░  0%│
│ │                                                   │
│ ├── Kanban                                          │
│ │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │   │ Todo    │ │ In Prog │ │ Review  │ │ Done   │ │
│ │   │         │ │         │ │         │ │        │ │
│ │   │ Build   │ │ Plymouth│ │ Service │ │ Boot   │ │
│ │   │ Desktop │ │ Theme   │ │ Config  │ │ Splash │ │
│ │   │         │ │         │ │         │ │        │ │
│ │   │ Create  │ │ GDM     │ │         │ │ File   │ │
│ │   │ ISO     │ │ Theming │ │         │ │ Layout │ │
│ │   └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│ │                                                   │
│ ├── Blueprints                                      │
│ │   ├── Architecture                                │
│ │   ├── Boot Experience                             │
│ │   └── Services                                    │
│ └── Tasks                                           │
│     ├── [ ] Plymouth theme design                   │
│     ├── [x] Repository setup                        │
│     ├── [ ] Service unit files                      │
│     └── [ ] GDM theming                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **Kanban boards** — Drag-and-drop task management
- **Roadmaps** — Milestone-based planning
- **Blueprints** — Architecture and design documents
- **AI-assisted planning** — "Break this feature into tasks"
- **Git integration** — Link tasks to commits and PRs
- **Time tracking** — Optional time logging

---

## Vestara Knowledge

RAG engine and document intelligence center.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Knowledge                    [+ Add Document]│
├──────────────────────────────────────────────────────┤
│                                                      │
│ Search: "How does the model router work?"     [🔍]  │
│                                                      │
│ Results (3):                                         │
│                                                      │
│ 1. Model Router Architecture (98% match)             │
│    "The model router uses a priority-based..."       │
│    Source: blueprints/03-services.md:45              │
│                                                      │
│ 2. AI Gateway Integration (87% match)                │
│    "Requests flow from the desktop through..."       │
│    Source: blueprints/01-architecture.md:112         │
│                                                      │
│ 3. Service Communication (72% match)                 │
│    "Services communicate via HTTP REST..."           │
│    Source: blueprints/03-services.md:89              │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Documents (47)     Collections (5)     Indexes (3)  │
│ ├── Blueprints (12) ├── Vestara Docs   ├── Default  │
│ ├── Code (23)       ├── Research       ├── Code     │
│ └── Notes (12)      └── Personal       └── Notes    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **Multi-format ingestion** — PDF, Markdown, DOCX, HTML, code files
- **Automatic chunking** — Smart text splitting for embeddings
- **Semantic search** — Natural language queries
- **RAG queries** — AI-powered answers with source citations
- **Document collections** — Organize by project or topic
- **Incremental indexing** — Auto-reindex on document changes
- **Source citations** — Every answer links to source location

---

## Vestara Terminal

AI-powered terminal with intelligent suggestions.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Terminal                              [+]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ $ vestara services status                            │
│                                                      │
│ Service            Status    Uptime    Memory        │
│ ─────────────────────────────────────────────────    │
│ vestara-core       ● running  2d 4h    128MB         │
│ vestara-ai-gateway ● running  2d 4h    256MB         │
│ vestara-memory     ● running  2d 4h    512MB         │
│ vestara-knowledge  ● running  2d 4h    384MB         │
│ vestara-agents     ● running  2d 4h    196MB         │
│                                                      │
│ $ _                                                   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ 💡 Suggestion: Try `vestara models list`       │   │
│ │    to see available AI models                   │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **AI command suggestions** — Context-aware command recommendations
- **Natural language → command** — "show me running services" → `vestara services status`
- **Auto-complete** — Smart completions for Vestara CLI
- **Error explanation** — AI explains error messages and suggests fixes
- **Command history** — Searchable, with AI-powered categorization
- **Multi-tab** — Multiple terminal sessions
- **Split panes** — Side-by-side terminals

---

## Vestara Developer

Full development environment.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Developer                                     │
├──────┬───────────────────────────────────────────────┤
│ Files│  ┌───────────────────────────────────────────┐│
│      │  │ // vestara/services/ai-gateway/src/       ││
│ src/ │  │ // routes/chat.ts                         ││
│ ├── a│  │                                           ││
│ │  ga│  │ import { Router } from 'express';          ││
│ │  te│  │ import { validate } from '@vestara/valid'; ││
│ │  wa│  │                                           ││
│ │  y │  │ export const chatRouter = Router();        ││
│ ├── m│  │                                           ││
│ │  mo│  │ chatRouter.post('/', async (req, res) => {││
│ │  de│  │   const { message, model } = req.body;    ││
│ │  l │  │   // AI-powered code review               ││
│ │  ro│  │   const response = await routeModel({     ││
│ │  ut│  │     message,                              ││
│ │  er│  │     model: model || 'auto',               ││
│ │    │  │   });                                     ││
│ └────│  │   res.json(response);                     ││
│      │  │ });                                       ││
│      │  └───────────────────────────────────────────┘│
│ Git  │  ┌───────────────────────────────────────────┐│
│ Log  │  │ AI: "This route could benefit from        ││
│      │  │  rate limiting. Add express-rate-limit     ││
│ │    │  │  middleware before the POST handler."      ││
│      │  └───────────────────────────────────────────┘│
│ Docker│                                              │
│ K8s  │                                              │
└──────┴───────────────────────────────────────────────┘
```

### Capabilities

- **Monaco editor** — VS Code's editor in the browser
- **Git integration** — Visual diff, commit, branch management
- **Docker management** — Container lifecycle, logs, exec
- **Kubernetes** — Pod management, deployment visualization
- **AI code review** — Inline suggestions and improvements
- **Terminal integration** — Built-in terminal panel
- **Debugger** — Breakpoints, variable inspection

---

## Vestara Marketplace

Plugin and extension ecosystem.

```
┌──────────────────────────────────────────────────────┐
│ Vestara Marketplace                [Search plugins]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Featured                                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ 🤖 GitHub  │ │ 📊 Analytics│ │ 🔐 Security│        │
│ │ Integration│ │ Dashboard  │ │ Scanner    │        │
│ │ ★ 4.8      │ │ ★ 4.6      │ │ ★ 4.9      │        │
│ │ 12K installs│ │ 8K installs│ │ 15K installs│       │
│ └────────────┘ └────────────┘ └────────────┘        │
│                                                      │
│ Categories                                           │
│ ├── AI Agents                                       │
│ │   ├── Research Agent                              │
│ │   ├── Coding Agent                                │
│ │   └── Writing Agent                               │
│ ├── Prompts                                         │
│ │   ├── PRD Generator                               │
│ │   ├── Code Review                                 │
│ │   └── Documentation                               │
│ ├── Workflows                                       │
│ │   ├── Daily Standup                               │
│ │   ├── Sprint Planning                             │
│ │   └── Release Notes                               │
│ ├── Integrations                                    │
│ │   ├── GitHub                                      │
│ │   ├── Linear                                      │
│ │   └── Slack                                       │
│ └── Templates                                       │
│     ├── React App                                   │
│     ├── API Server                                  │
│     └── CLI Tool                                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Capabilities

- **Browse plugins** — Search by category, rating, popularity
- **One-click install** — Install agents, prompts, workflows, templates
- **Auto-updates** — Keep plugins updated
- **Ratings and reviews** — Community feedback
- **Publisher portal** — Create and publish your own plugins
- **Dependency management** — Resolve plugin conflicts

---

## Application Architecture

All applications share:

```
├── React 19                    # UI framework
├── Vite 6                      # Build tool
├── Tailwind CSS 4              # Styling
├── MUI 7                       # Component library
├── TanStack React Query v5     # Data fetching
├── React Router DOM v7         # Routing
├── Zod v3                      # Validation
├── Socket.IO client            # Real-time
└── @vestara/*                  # Shared Vestara packages
```

### Shared Components

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Sidebar/
│   │   ├── StatusBar/
│   │   └── CommandPalette/
│   ├── hooks/
│   │   ├── useVestara.ts
│   │   ├── useService.ts
│   │   └── useNotification.ts
│   └── theme/
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
```

Each application imports from `@vestara/ui` for consistent look and behavior.
