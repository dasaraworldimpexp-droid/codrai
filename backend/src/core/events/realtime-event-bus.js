import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

export class RealtimeEventBus {
  constructor({ publisher, eventRepository } = {}) {
    this.emitter = new EventEmitter();
    this.publisher = publisher;
    this.eventRepository = eventRepository;
    this.buffer = [];
    this.maxBufferSize = Number(process.env.REALTIME_EVENT_BUFFER_SIZE || 1000);
    this.lastPersistenceError = null;
  }

  async publish(event) {
    const normalizedEvent = {
      id: event.id || randomUUID(),
      type: event.type,
      channel: event.channel,
      workspaceId: event.workspaceId,
      projectId: event.projectId,
      actorId: event.actorId,
      payload: event.payload || {},
      createdAt: event.createdAt || new Date().toISOString(),
    };

    if (!normalizedEvent.type || !normalizedEvent.channel || !normalizedEvent.workspaceId) {
      throw new Error("Realtime event requires type, channel, and workspaceId.");
    }

    await this.#appendOrBuffer(normalizedEvent);
    this.emitter.emit(normalizedEvent.channel, normalizedEvent);
    this.emitter.emit("*", normalizedEvent);
    await this.publisher?.publish?.(normalizedEvent.channel, normalizedEvent);

    return normalizedEvent;
  }

  async flushBufferedEvents() {
    if (!this.eventRepository?.append || this.buffer.length === 0) {
      return { flushed: 0, remaining: this.buffer.length };
    }

    let flushed = 0;
    const pending = [...this.buffer];
    this.buffer = [];

    for (const event of pending) {
      try {
        await this.eventRepository.append(event);
        flushed += 1;
      } catch (error) {
        this.lastPersistenceError = this.#errorMessage(error);
        this.buffer.push(event, ...pending.slice(flushed + this.buffer.length));
        break;
      }
    }

    return { flushed, remaining: this.buffer.length, lastPersistenceError: this.lastPersistenceError };
  }

  snapshot() {
    return {
      bufferedEvents: this.buffer.length,
      maxBufferSize: this.maxBufferSize,
      lastPersistenceError: this.lastPersistenceError,
    };
  }

  subscribe(channel, listener) {
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  async #appendOrBuffer(event) {
    if (!this.eventRepository?.append) return;

    try {
      await this.eventRepository.append(event);
      this.lastPersistenceError = null;
    } catch (error) {
      this.lastPersistenceError = this.#errorMessage(error);
      this.buffer.push(event);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
      }
    }
  }

  #errorMessage(error) {
    if (error?.message) return error.message;
    if (Array.isArray(error?.errors) && error.errors.length) {
      return error.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
    }
    return String(error);
  }
}
