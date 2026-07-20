import type { ChatProvider, ChatRequest, ChatResponse, StreamChunk } from './types.js';

interface GoogleConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GoogleProvider implements ChatProvider {
  readonly id = 'google';
  readonly name = 'Google Gemini';

  private apiKey: string;
  private baseUrl: string;

  constructor(config: GoogleConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || 'gemini-2.5-flash';
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const res = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && {
            systemInstruction: { parts: [{ text: systemInstruction.content }] },
          }),
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 4096,
          },
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google API error: ${res.status} ${error}`);
    }

    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> }; finishReason: string }>;
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };

    const candidate = data.candidates[0];
    return {
      content: candidate.content.parts.map((p) => p.text).join(''),
      model,
      provider: this.id,
      tokens: {
        input: data.usageMetadata?.promptTokenCount || 0,
        output: data.usageMetadata?.candidatesTokenCount || 0,
      },
      finishReason: candidate.finishReason || 'STOP',
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || 'gemini-2.5-flash';
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const res = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && {
            systemInstruction: { parts: [{ text: systemInstruction.content }] },
          }),
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 4096,
          },
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google API error: ${res.status} ${error}`);
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
            candidates?: Array<{ content?: { parts?: Array<{ text: string }> }; finishReason?: string }>;
          };

          if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
            yield { content: parsed.candidates[0].content.parts[0].text, done: false };
          }

          if (parsed.candidates?.[0]?.finishReason) {
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
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ];
  }
}
