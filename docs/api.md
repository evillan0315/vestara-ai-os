# Vestara AI OS — API Reference

Complete reference for all REST API endpoints.

**Base URL:** `http://localhost:3000`

**Auth:** Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Health

### `GET /api/health`

Public health check.

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "version": "0.1.0",
  "timestamp": "2026-07-22T00:00:00.000Z",
  "providers": {
    "openai": true,
    "anthropic": false,
    "ollama": true
  }
}
```

---

## Authentication

### `GET /api/auth/os-user`

Detect the current OS user.

**Response:**
```json
{
  "user": "eddie"
}
```

### `POST /api/auth/os-login`

Login with OS credentials.

**Body:**
```json
{
  "username": "eddie",
  "password": "****"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": { "id": "uuid", "name": "eddie", "role": "admin" }
}
```

### `POST /api/auth/os-auto-login`

Auto-login as current OS user (no password required).

**Response:** Same as `/api/auth/os-login`.

### `GET /api/auth/me`

Get current authenticated user.

**Response:**
```json
{
  "user": { "id": "uuid", "name": "eddie", "role": "admin" }
}
```

### `DELETE /api/auth/logout`

Logout (invalidates session).

---

## System

### `GET /api/system/stats`

CPU, RAM, and disk usage statistics.

### `GET /api/system/health`

Service-level health check.

### `GET /api/system/info`

Detailed system information (OS, kernel, hostname, etc.).

### `POST /api/system/exec`

Execute a shell command.

**Body:**
```json
{
  "command": "ls -la /home/ai"
}
```

---

## OpenCode

All OpenCode endpoints are under `/api/providers/opencode/`.

### `GET /api/providers/opencode/status`

OpenCode server status.

**Response:**
```json
{
  "running": true,
  "port": 4096,
  "serverUrl": "http://localhost:4096",
  "cwd": "/home/ai/workspace"
}
```

### `POST /api/providers/opencode/start`

Start OpenCode server.

**Body:**
```json
{
  "cwd": "/home/ai/workspace/my-project"
}
```

### `POST /api/providers/opencode/stop`

Stop OpenCode server.

### `GET /api/providers/opencode/models`

List available models from configured providers.

### `POST /api/providers/opencode/chat`

Send a chat message to OpenCode.

### `GET /api/providers/opencode/chats`

List chat sessions.

### `POST /api/providers/opencode/chats`

Create a new chat session.

### `GET /api/providers/opencode/chats/:id`

Get chat with messages.

### `PATCH /api/providers/opencode/chats/:id`

Rename a chat session.

### `DELETE /api/providers/opencode/chats/:id`

Delete a chat session.

### `POST /api/providers/opencode/chats/:id/messages`

Send a message in a chat session.

---

## AI Chat & Conversations

### `POST /api/chat`

Send a chat message (SSE streaming response).

**Body:**
```json
{
  "message": "What is Vestara?",
  "model": "opencode/deepseek-v4-flash-free",
  "conversationId": "uuid"
}
```

### `GET /api/conversations`

List conversations.

### `GET /api/conversations/:id`

Get conversation with all messages.

### `DELETE /api/conversations/:id`

Delete a conversation.

---

## Providers

### `GET /api/providers`

List configured AI providers.

### `POST /api/providers`

Add a new provider.

### `PUT /api/providers/:id`

Update a provider.

### `DELETE /api/providers/:id`

Delete a provider.

### `POST /api/providers/:id/test`

Test provider connection.

---

## Agents

### `GET /api/agents`

List agents.

### `GET /api/agents/stats`

Agent execution statistics.

### `POST /api/agents`

Create an agent.

### `POST /api/agents/:id/run`

Execute an agent task.

### `POST /api/agents/:id/execute`

Execute an agent (alternative endpoint).

---

## Memory

### `GET /api/memory`

List memories.

### `POST /api/memory`

Create a memory.

**Body:**
```json
{
  "content": "User prefers dark mode",
  "type": "fact"
}
```

### `GET /api/memory/search?q=query`

Search memories by content.

---

## Knowledge

### `GET /api/knowledge`

List knowledge entries.

### `POST /api/knowledge`

Add a knowledge entry.

**Body:**
```json
{
  "content": "Document content here",
  "type": "document",
  "source": "filename.md"
}
```

### `GET /api/knowledge/search?q=query`

Search knowledge base.

---

## Projects

### `GET /api/projects`

List projects.

### `GET /api/projects/stats`

Project statistics (counts by status, recent activity).

### `POST /api/projects`

Create a project.

**Body:**
```json
{
  "name": "My Project",
  "description": "Project description",
  "path": "/home/ai/workspace/my-project"
}
```

### `PATCH /api/projects/:id`

Update project.

### `DELETE /api/projects/:id`

Delete project.

### `POST /api/projects/:id/clone`

Clone a project.

### `POST /api/projects/:id/archive`

Archive project to `.vestara` format.

### `GET /api/projects/:id/activity`

Project activity timeline.

### `GET /api/projects/:id/tasks`

List tasks for a project.

### `POST /api/projects/:id/tasks`

Create a task.

**Body:**
```json
{
  "title": "Implement feature X",
  "description": "Details...",
  "status": "todo",
  "parentId": "uuid",
  "tags": ["feature", "frontend"],
  "estimatedHours": 4
}
```

### `PATCH /api/projects/:id/tasks/:taskId`

Update task.

### `DELETE /api/projects/:id/tasks/:taskId`

Delete task.

### `POST /api/projects/:id/tasks/bulk-update`

Bulk update tasks.

**Body:**
```json
{
  "taskIds": ["uuid1", "uuid2"],
  "updates": { "status": "done" }
}
```

---

## Users

Admin-only endpoints.

### `GET /api/users`

List all users.

### `GET /api/users/system`

List OS users.

### `POST /api/users`

Create a user.

### `PUT /api/users/:id`

Update user.

### `DELETE /api/users/:id`

Delete user.

### `POST /api/users/sync-os`

Sync OS users to database.

---

## Scripts

### `GET /api/scripts`

List all available scripts.

### `GET /api/scripts/:name`

Get script details, documentation, and source code.

### `POST /api/scripts/:name/run`

Execute a script with arguments.

**Body:**
```json
{
  "args": ["--device", "/dev/sdb"]
}
```

### `POST /api/scripts/:name/stream`

Execute a script with streaming output (SSE).

---

## Files

### `GET /api/files/list?path=/home/ai`

List directory contents.

### `GET /api/files/read?path=/home/ai/file.txt`

Read file content.

### `POST /api/files/write`

Create or overwrite a file.

**Body:**
```json
{
  "path": "/home/ai/workspace/file.txt",
  "content": "File content here"
}
```

### `POST /api/files/mkdir`

Create directory.

**Body:** `{ "path": "/home/ai/workspace/new-dir" }`

### `POST /api/files/delete`

Delete file or directory.

**Body:** `{ "path": "/home/ai/workspace/file.txt" }`

### `POST /api/files/rename`

Rename or move file/directory.

**Body:**
```json
{
  "oldPath": "/home/ai/workspace/old-name.txt",
  "newPath": "/home/ai/workspace/new-name.txt"
}
```

### `GET /api/files/tree?path=/home/ai&depth=3`

Directory tree for sidebar navigation.

### `GET /api/files/search?path=/home/ai&query=*.ts`

Search files by name pattern.

---

## Activity

### `GET /api/activity?limit=20`

List recent activity entries.

---

## Notifications

### `GET /api/notifications?unreadOnly=true&limit=20`

List notifications.

### `POST /api/notifications/:id/read`

Mark a notification as read.

### `POST /api/notifications/read-all`

Mark all notifications as read.

---

## Logs

### `GET /api/logs?level=info&source=api&limit=50`

List recent log entries from ring buffer.

### `GET /api/logs/stream`

SSE streaming log entries in real-time.

---

## Settings

### `GET /api/settings`

Get all settings as key-value pairs.

### `GET /api/settings/:key`

Get a single setting by key.

### `PUT /api/settings/:key`

Set a setting value.

**Body:** `{ "value": "dark" }`

---

## Analytics

### `GET /api/analytics/projects`

Analyze all projects (task completion rates, time tracking, etc.).

### `GET /api/analytics/projects/:id`

Analyze a single project.

---

## Ollama

### `GET /api/ollama/status`

Ollama status — running, loaded models, RAM usage.

### `POST /api/ollama/pull`

Pull a model.

**Body:** `{ "model": "llama2" }`

### `POST /api/ollama/start`

Start Ollama process.

### `POST /api/ollama/stop`

Stop Ollama process.

---

## WebSocket

### `ws://localhost:3000/ws`

Real-time event stream.

**Events:**
- `notification:new` — New notification
- `agent:status` — Agent execution status change
- `chat:stream` — Streaming chat response
- `model:loaded` — Model loaded
- `model:unloaded` — Model unloaded
- `system:stats` — Periodic system stats update
- `log:entry` — New log entry
