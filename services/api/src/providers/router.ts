/**
 * AI Provider Router
 *
 * Manages all providers and routes requests to the best available one.
 * Falls back to other providers if the preferred one is unavailable.
 */

import type { ChatProvider, ChatRequest, ChatResponse, StreamChunk } from './types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { OllamaProvider } from './ollama.js';
import { createLogger } from '@vestara/core';

const logger = createLogger('ai-router');

export interface ProviderConfig {
  openai?: { apiKey: string; baseUrl?: string };
  anthropic?: { apiKey: string; baseUrl?: string };
  google?: { apiKey: string; baseUrl?: string };
  ollama?: { baseUrl?: string };
}

export class AIRouter {
  private providers = new Map<string, ChatProvider>();
  private defaultProvider: string;

  constructor(config: ProviderConfig, defaultProvider = 'openai') {
    this.defaultProvider = defaultProvider;

    if (config.openai) {
      this.providers.set('openai', new OpenAIProvider(config.openai));
    }
    if (config.anthropic) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropic));
    }
    if (config.google) {
      this.providers.set('google', new GoogleProvider(config.google));
    }
    if (config.ollama) {
      this.providers.set('ollama', new OllamaProvider(config.ollama));
    }
  }

  /** Get a specific provider */
  getProvider(id: string): ChatProvider | undefined {
    return this.providers.get(id);
  }

  /** Get the default provider */
  getDefaultProvider(): ChatProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  /** Set the default provider */
  setDefaultProvider(id: string): void {
    if (this.providers.has(id)) {
      this.defaultProvider = id;
    }
  }

  /** List all registered providers */
  listProviders(): Array<{ id: string; name: string; available: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      available: false, // Will be checked async
    }));
  }

  /** Check availability of all providers */
  async checkAvailability(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [id, provider] of this.providers) {
      try {
        results[id] = await provider.isAvailable();
      } catch {
        results[id] = false;
      }
    }
    return results;
  }

  /** Route a chat request to the best available provider */
  async chat(request: ChatRequest, preferredProvider?: string): Promise<ChatResponse> {
    const providerId = preferredProvider || this.defaultProvider;
    const provider = this.providers.get(providerId);

    if (provider) {
      try {
        return await provider.chat(request);
      } catch (err) {
        logger.error({ provider: providerId, error: err }, 'Provider failed, trying fallback');
      }
    }

    // Fallback: try all other providers
    for (const [id, fallback] of this.providers) {
      if (id === providerId) continue;
      try {
        if (await fallback.isAvailable()) {
          logger.info({ fallback: id }, 'Using fallback provider');
          return await fallback.chat(request);
        }
      } catch {
        continue;
      }
    }

    throw new Error('No AI providers available');
  }

  /** Route a streaming chat request */
  async *chatStream(
    request: ChatRequest,
    preferredProvider?: string,
  ): AsyncGenerator<StreamChunk> {
    const providerId = preferredProvider || this.defaultProvider;
    const provider = this.providers.get(providerId);

    if (provider) {
      try {
        yield* provider.chatStream(request);
        return;
      } catch (err) {
        logger.error({ provider: providerId, error: err }, 'Stream provider failed');
      }
    }

    // Fallback
    for (const [id, fallback] of this.providers) {
      if (id === providerId) continue;
      try {
        if (await fallback.isAvailable()) {
          yield* fallback.chatStream(request);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error('No AI providers available');
  }

  /** List models from all providers */
  async listAllModels(): Promise<Array<{ provider: string; id: string; name: string }>> {
    const models: Array<{ provider: string; id: string; name: string }> = [];

    for (const [id, provider] of this.providers) {
      try {
        const providerModels = await provider.listModels();
        models.push(
          ...providerModels.map((m) => ({ provider: id, id: m.id, name: m.name })),
        );
      } catch {
        continue;
      }
    }

    return models;
  }
}

/** Parse a model string like "anthropic/claude-sonnet-4" into provider + model */
export function parseModelString(modelStr: string): { provider: string; model: string } {
  const parts = modelStr.split('/');
  if (parts.length === 2) {
    return { provider: parts[0], model: parts[1] };
  }
  return { provider: '', model: modelStr };
}
