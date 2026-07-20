# Vestara AI OS — Applications

> Built-in applications that make the AI workstation complete.
> MVP focuses on 6 core screens. Everything else follows.

---

## Application Overview

### MVP (Phase 1)

| App | Screen | Purpose |
|---|---|---|
| Dashboard | 1 | System overview, quick actions |
| AI Chat | 2 | Primary AI interface |
| Agent Manager | 3 | Agent configuration and execution |
| Model Manager | 4 | Provider and model selection |
| Settings | 6 | System configuration |

### Phase 2

| App | Screen | Purpose |
|---|---|---|
| Projects | 5 | Project management, Kanban |
| Knowledge Base | 6 | RAG, document indexing |
| Files | 7 | File browser with preview |
| Terminal | 10 | AI-powered terminal |

### Phase 3

| App | Screen | Purpose |
|---|---|---|
| Docker Manager | 8 | Container management |
| Git Manager | 9 | Lightweight Git client |
| Marketplace | 11 | Plugin ecosystem |

### Future

| App | Purpose |
|---|---|
| AI Workflow Builder | Visual LangGraph editor |
| Prompt Library | Organize and version prompts |
| AI Analytics | Token usage, cost tracking |
| Memory Inspector | View and manage memories |
| Multi-Agent Dashboard | Agent collaboration view |
| Kubernetes Dashboard | K8s management |
| Cloud Manager | AWS, Azure, GCP |
| ComfyUI Studio | Image generation |
| Voice Assistant | Voice interaction |

---

## Dashboard

The home screen after boot.

### Components

```
Dashboard/
├── StatusCards/
│   ├── AIStatusCard.tsx          # Service health
│   ├── ProviderCard.tsx          # Active AI provider
│   ├── RAMCard.tsx               # Memory usage
│   ├── CPUCard.tsx               # CPU usage
│   ├── GPUCard.tsx               # GPU usage (if available)
│   ├── DiskCard.tsx              # SSD space
│   ├── AgentsCard.tsx            # Running agents
│   └── StorageCard.tsx           # Storage breakdown
├── QuickActions/
│   ├── NewChatButton.tsx
│   ├── OpenTerminalButton.tsx
│   ├── ProjectsButton.tsx
│   └── SettingsButton.tsx
├── RecentActivity/
│   ├── RecentConversations.tsx
│   ├── RecentProjects.tsx
│   └── RecentDocuments.tsx
└── Dashboard.tsx                 # Main dashboard layout
```

### Data Sources

```typescript
// API calls
GET /api/system/stats         → CPU, RAM, disk
GET /api/providers            → Provider status
GET /api/agents               → Agent list + status
GET /api/conversations?limit=5 → Recent conversations
GET /api/projects?limit=3     → Recent projects
```

---

## AI Chat

The primary AI interface. Think ChatGPT + VS Code + OpenCode.

### Components

```
Chat/
├── ConversationList/
│   ├── ConversationItem.tsx
│   └── ConversationList.tsx
├── ChatInterface/
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx
│   ├── CodeBlock.tsx
│   ├── ToolPanel.tsx
│   └── ChatInput.tsx
├── ModelSelector/
│   └── ModelSelector.tsx
├── Tabs/
│   ├── CodeTab.tsx
│   ├── FilesTab.tsx
│   ├── ArtifactsTab.tsx
│   ├── ReasoningTab.tsx
│   └── UsageTab.tsx
└── Chat.tsx                     # Main chat layout
```

### Features

- **Multi-model** — Switch between providers mid-conversation
- **Streaming** — Real-time response rendering
- **Code blocks** — Syntax highlighting, copy, apply to file
- **File attachments** — Drag & drop, paste images
- **Action buttons** — Apply to File, Copy, Explain, Refactor
- **Token tracking** — Real-time token count and cost estimation
- **Markdown** — Full markdown rendering (tables, math, lists)
- **Voice input** — Speech-to-text (future)

### API Endpoints

```typescript
POST /api/chat                 → Send message (streaming)
GET  /api/conversations        → List conversations
GET  /api/conversations/:id    → Get conversation
DELETE /api/conversations/:id  → Delete conversation
POST /api/conversations/:id/title → Auto-generate title
```

---

## Agent Manager

The heart of the platform. Configure, run, and monitor AI agents.

### Components

```
Agents/
├── AgentGrid/
│   ├── AgentCard.tsx
│   └── AgentGrid.tsx
├── AgentDetail/
│   ├── AgentInfo.tsx
│   ├── AgentConfig.tsx
│   ├── AgentHistory.tsx
│   └── AgentMetrics.tsx
├── AgentCreator/
│   ├── AgentForm.tsx
│   ├── ToolSelector.tsx
│   └── ModelSelector.tsx
└── AgentManager.tsx            # Main agents layout
```

### Built-in Agents

| Agent | Description | Tools |
|---|---|---|
| Planner | Decomposes tasks into steps | Read, Write |
| Software Developer | Writes and refactors code | Read, Write, Execute, Search |
| DevOps | Infrastructure management | Docker, Shell, HTTP |
| Cloud Engineer | Cloud resource management | AWS/Azure/GCP APIs |
| Research | Web search and analysis | Search, Fetch, Summarize |
| Documentation | Generates documentation | Read, Write |
| QA | Testing and bug detection | Read, Execute, Report |
| Security | Vulnerability scanning | Read, Execute, Report |

### Agent Execution Flow

```
User Input
    ↓
Agent Manager
    ↓
Select Agent + Model
    ↓
Agent Runtime
    ├── Load agent config
    ├── Load tools
    ├── Load memory context
    └── Execute loop
        ├── Think (reasoning)
        ├── Act (tool use)
        ├── Observe (result)
        └── Repeat until done
    ↓
Return Result
    ↓
Update Memory
    ↓
Notify User
```

---

## Model Manager

Provider and model selection.

### Components

```
Models/
├── ProviderList/
│   ├── ProviderItem.tsx
│   └── ProviderList.tsx
├── ModelList/
│   ├── ModelCard.tsx
│   └── ModelList.tsx
├── ModelDetail/
│   ├── ModelInfo.tsx
│   ├── ModelConfig.tsx
│   └── ModelMetrics.tsx
├── ProviderSetup/
│   ├── APIKeyForm.tsx
│   └── ConnectionTest.tsx
└── ModelManager.tsx            # Main models layout
```

### Provider Configuration

```typescript
interface Provider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama' | 'lmstudio';
  apiKey?: string;           // Encrypted
  baseUrl?: string;
  enabled: boolean;
  models: Model[];
}

interface Model {
  id: string;
  providerId: string;
  name: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  ramRequired?: number;      // For local models
  costPer1kInput: number;
  costPer1kOutput: number;
}
```

### Ollama Management

```typescript
// Start Ollama (on-demand)
POST /api/ollama/start

// Stop Ollama
POST /api/ollama/stop

// Pull model
POST /api/ollama/pull { model: "phi4" }

// List local models
GET /api/ollama/models
```

---

## Knowledge Base

RAG engine and document intelligence.

### Components

```
Knowledge/
├── DocumentList/
│   ├── DocumentItem.tsx
│   └── DocumentList.tsx
├── Search/
│   ├── SearchBar.tsx
│   └── SearchResult.tsx
├── Upload/
│   ├── UploadZone.tsx
│   └── ProcessingStatus.tsx
├── Collections/
│   ├── CollectionList.tsx
│   └── CollectionDetail.tsx
└── Knowledge.tsx               # Main knowledge layout
```

### Supported Formats

- PDF
- DOCX
- Markdown
- HTML
- Plain text
- Code files (any language)
- JSON/YAML

### Features

- Automatic chunking
- Embedding generation (local or API)
- Semantic search
- RAG queries with source citations
- Document collections
- Incremental re-indexing

---

## Settings

System configuration.

### Categories

```
Settings/
├── Appearance/
│   ├── ThemeSelector.tsx
│   ├── FontSelector.tsx
│   └── WallpaperSelector.tsx
├── AIProviders/
│   ├── ProviderList.tsx
│   ├── APIKeyManager.tsx
│   └── ConnectionTest.tsx
├── LocalModels/
│   ├── OllamaConfig.tsx
│   ├── ModelDownloader.tsx
│   └── ResourceLimits.tsx
├── Storage/
│   ├── DiskUsage.tsx
│   ├── BackupManager.tsx
│   └── CleanupTools.tsx
├── Memory/
│   ├── MemoryConfig.tsx
│   ├── RetentionPolicy.tsx
│   └── ExportImport.tsx
├── Security/
│   ├── PasswordChange.tsx
│   ├── EncryptionStatus.tsx
│   └── APIKeyRotation.tsx
├── Startup/
│   ├── ServiceManager.tsx
│   └── BootConfig.tsx
├── Updates/
│   ├── UpdateChecker.tsx
│   └── UpdateHistory.tsx
└── Settings.tsx                # Main settings layout
```

---

## Design System

### Glassmorphism Components

```css
/* Glass card */
.glass-card {
  background: rgba(15, 15, 25, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 24px;
}

/* Glass panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

/* Gold accent button */
.btn-gold {
  background: linear-gradient(135deg, #C9A84C, #E4C76B);
  color: #06060C;
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.2s;
}

.btn-gold:hover {
  background: linear-gradient(135deg, #E4C76B, #C9A84C);
  box-shadow: 0 0 20px rgba(201, 168, 76, 0.3);
}

/* AI activity indicator */
.ai-active {
  color: #4F8CFF;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Component Library

All components follow:

- Dark backgrounds with glassmorphism
- Gold accents for primary actions
- Blue/purple for AI-related elements
- Consistent spacing (4px grid)
- Smooth transitions (200ms)
- Hover states with glow effects
