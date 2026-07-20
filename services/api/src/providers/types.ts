/**
 * AI Provider Abstraction
 *
 * Unified interface for all AI providers.
 * Each provider implements the same ChatProvider interface.
 * The router selects the best provider based on config and availability.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  tokens: {
    input: number;
    output: number;
  };
  cost?: number;
  finishReason: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  model?: string;
}

export interface ChatProvider {
  readonly id: string;
  readonly name: string;

  /** Check if this provider is configured and available */
  isAvailable(): Promise<boolean>;

  /** Send a chat request (non-streaming) */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /** Send a chat request (streaming) */
  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;

  /** List available models */
  listModels(): Promise<Array<{ id: string; name: string }>>;
}
