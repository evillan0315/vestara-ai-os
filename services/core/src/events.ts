import { EventEmitter } from 'node:events';

type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on(event: string, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    this.emitter.once(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }

  removeAllListeners(event?: string): void {
    this.emitter.removeAllListeners(event);
  }
}

export const eventBus = new EventBus();
