export class RealtimeClient {
  constructor({ baseUrl, tokenProvider }) {
    this.baseUrl = baseUrl;
    this.tokenProvider = tokenProvider;
    this.sources = new Map();
  }

  subscribe({ channel, onEvent, onError }) {
    const url = new URL("/api/events/stream", this.baseUrl);
    url.searchParams.set("channel", channel);

    const token = this.tokenProvider?.();
    if (token) {
      url.searchParams.set("access_token", token);
    }

    const source = new EventSource(url);
    source.onmessage = (message) => onEvent(JSON.parse(message.data));
    source.onerror = (error) => onError?.(error);

    this.sources.set(channel, source);

    return () => {
      source.close();
      this.sources.delete(channel);
    };
  }

  closeAll() {
    for (const source of this.sources.values()) {
      source.close();
    }
    this.sources.clear();
  }
}
