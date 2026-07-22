export interface AIRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

export interface AIProvider {
  chat(request: AIRequest): Promise<AIResponse>;
}
