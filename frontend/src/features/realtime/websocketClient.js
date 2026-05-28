export class CodraiWebSocketClient {
  constructor({ url, tokenProvider }) {
    this.url = url;
    this.tokenProvider = tokenProvider;
    this.socket = null;
    this.listeners = new Set();
  }

  connect() {
    const token = this.tokenProvider?.();
    const url = token ? `${this.url}?access_token=${encodeURIComponent(token)}` : this.url;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      const event = JSON.parse(message.data);
      this.listeners.forEach((listener) => listener(event));
    };
    return this.socket;
  }

  subscribe(channel) {
    this.#sendWhenOpen({ type: "subscribe", channel });
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }

  #sendWhenOpen(payload) {
    const send = () => this.socket?.send(JSON.stringify(payload));
    if (this.socket?.readyState === WebSocket.OPEN) {
      send();
      return;
    }
    this.socket?.addEventListener("open", send, { once: true });
  }
}
