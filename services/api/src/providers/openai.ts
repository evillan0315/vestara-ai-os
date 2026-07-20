import type { ChatProvider, ChatRequest, ChatResponse, StreamChunk } from './types.js';

interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenAIProvider implements ChatProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4o',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${error}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number };
      model: string;
    };

    const choice = data.choices[0];
    return {
      content: choice.message.content,
      model: data.model,
      provider: this.id,
      tokens: {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
      },
      finishReason: choice.finish_reason,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4o',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${error}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string }; finish_reason: string | null }>;
          };
          const choice = parsed.choices[0];
          if (choice.delta.content) {
            yield { content: choice.delta.content, done: false };
          }
          if (choice.finish_reason) {
            yield { content: '', done: true };
            return;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) return [];
      const data = await res.json() as { data: Array<{ id: string }> };
      return data.data
        .filter((m) => m.id.startsWith('gpt-') || m.id.startsWith('o'))
        .map((m) => ({ id: m.id, name: m.id }));
    } catch {
      return [];
    }
  }
}
