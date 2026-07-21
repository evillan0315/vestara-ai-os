// ──────────────────────────────────────────────
// Shared Types — Enums, DTOs, Interfaces
// ──────────────────────────────────────────────

// ── Enums ─────────────────────────────────────

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
}

export enum AgentType {
  PLANNER = 'planner',
  DEVELOPER = 'developer',
  DEVOPS = 'devops',
  CLOUD_ENGINEER = 'cloud_engineer',
  RESEARCH = 'research',
  DOCUMENTATION = 'documentation',
  QA = 'qa',
  SECURITY = 'security',
  CUSTOM = 'custom',
}

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum DocumentStatus {
  PENDING = 'pending',
  INDEXING = 'indexing',
  INDEXED = 'indexed',
  ERROR = 'error',
}

export enum MemoryType {
  WORKING = 'working',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}

export enum NotificationType {
  SYSTEM = 'system',
  AI = 'ai',
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  SYNC = 'sync',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ── Interfaces ────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  apiKeyEncrypted?: string;
  baseUrl?: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'opencode';

export interface Model {
  id: string;
  providerId: string;
  name: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  ramRequired?: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  local: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  modelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  createdAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  key: string;
  value: string;
  context?: string;
  importance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  path?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  parentId?: string;
  tags?: string[];
  estimatedHours?: number;
  loggedHours?: number;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  type: AgentType;
  providerId?: string;
  modelId?: string;
  config: AgentConfig;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  systemPrompt?: string;
  tools: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  input: string;
  output?: string;
  tokens?: number;
  cost?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  config: Record<string, unknown>;
  installedAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ── DTOs ──────────────────────────────────────

export interface CreateConversationDTO {
  title?: string;
  modelId?: string;
}

export interface SendMessageDTO {
  content: string;
  modelId?: string;
}

export interface CreateAgentDTO {
  name: string;
  type: AgentType;
  providerId?: string;
  modelId?: string;
  config?: Partial<AgentConfig>;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  path?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CloneProjectDTO {
  name: string;
  includeTasks?: boolean;
  includeConversations?: boolean;
  includeOpenCodeChats?: boolean;
}

export interface BulkUpdateTasksDTO {
  ids: string[];
  status?: TaskStatus;
  assigneeId?: string;
  tags?: string[];
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
  parentId?: string;
  tags?: string[];
  estimatedHours?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
  parentId?: string;
  tags?: string[];
  estimatedHours?: number;
  loggedHours?: number;
  sortOrder?: number;
}

export interface UploadDocumentDTO {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// ── API Responses ─────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SystemStats {
  cpu: CpuStats;
  memory: MemoryStats;
  disk: DiskStats;
  gpu?: GpuStats;
}

export interface CpuStats {
  usage: number;
  cores: number;
  model: string;
}

export interface MemoryStats {
  total: number;
  used: number;
  free: number;
  vestara: number;
}

export interface DiskStats {
  total: number;
  used: number;
  free: number;
}

export interface GpuStats {
  name: string;
  memoryTotal: number;
  memoryUsed: number;
  utilization: number;
}

export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  uptime: number;
  version: string;
  services: Record<string, 'ok' | 'error' | 'stopped'>;
}

// ── WebSocket Events ──────────────────────────

export interface WSEvents {
  'notification:new': Notification;
  'agent:status': { agentId: string; status: AgentStatus };
  'chat:stream': { conversationId: string; content: string; done: boolean };
  'model:loaded': { modelId: string };
  'model:unloaded': { modelId: string };
  'system:stats': SystemStats;
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
