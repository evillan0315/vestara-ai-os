import type { ChatProvider, ChatRequest, ChatResponse, StreamChunk } from './types.js';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicProvider implements ChatProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';

  private apiKey: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const system = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages.filter((m) => m.role !== 'system');

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        ...(system && { system }),
        messages,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${error}`);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
      stop_reason: string;
    };

    return {
      content: data.content.map((c) => c.text).join(''),
      model: data.model,
      provider: this.id,
      tokens: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
      },
      finishReason: data.stop_reason,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const system = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages.filter((m) => m.role !== 'system');

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
        ...(system && { system }),
        messages,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${error}`);
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

        try {
          const parsed = JSON.parse(data) as {
            type: string;
            delta?: { type: string; text?: string };
            stop_reason?: string;
          };

          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield { content: parsed.delta.text, done: false };
          }

          if (parsed.type === 'message_stop') {
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
    return [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ];
  }
}
