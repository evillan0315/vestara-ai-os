import type { ChatProvider, ChatRequest, ChatResponse, StreamChunk } from './types.js';

interface OllamaConfig {
  baseUrl?: string;
}

export class OllamaProvider implements ChatProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama';

  private baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3.2',
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
        },
        stream: false,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Ollama API error: ${res.status} ${error}`);
    }

    const data = await res.json() as {
      message: { content: string };
      model: string;
      eval_count: number;
      prompt_eval_count: number;
      done_reason: string;
    };

    return {
      content: data.message.content,
      model: data.model,
      provider: this.id,
      tokens: {
        input: data.prompt_eval_count || 0,
        output: data.eval_count || 0,
      },
      finishReason: data.done_reason || 'stop',
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3.2',
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
        },
        stream: true,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Ollama API error: ${res.status} ${error}`);
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
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as {
            message?: { content?: string };
            done?: boolean;
          };

          if (parsed.message?.content) {
            yield { content: parsed.message.content, done: false };
          }

          if (parsed.done) {
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
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json() as { models: Array<{ name: string }> };
      return data.models.map((m) => ({ id: m.name, name: m.name }));
    } catch {
      return [];
    }
  }
}
