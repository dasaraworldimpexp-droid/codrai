import { WebSocketServer } from "ws";

export function attachRealtimeWebSocketServer(server, { eventBus }) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const maxMessageBytes = Number(process.env.WS_MAX_MESSAGE_BYTES || 65536);
  const maxSubscriptions = Number(process.env.WS_MAX_SUBSCRIPTIONS || 50);
  const metrics = {
    activeConnections: 0,
    totalConnections: 0,
    totalMessages: 0,
    rejectedMessages: 0,
    malformedMessages: 0,
    activeSubscriptions: 0,
  };

  wss.on("error", (error) => {
    console.error(`CODRAI realtime WebSocket error: ${error.message}`);
  });

  wss.on("connection", (socket) => {
    const unsubscribeHandlers = [];
    const subscribedChannels = new Set();
    metrics.activeConnections += 1;
    metrics.totalConnections += 1;

    socket.on("message", (raw) => {
      metrics.totalMessages += 1;
      if (raw.byteLength > maxMessageBytes) {
        metrics.rejectedMessages += 1;
        socket.send(JSON.stringify({ type: "error", message: "WebSocket message exceeds allowed size." }));
        return;
      }

      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        metrics.malformedMessages += 1;
        socket.send(JSON.stringify({ type: "error", message: "Malformed WebSocket JSON payload." }));
        return;
      }

      if (message.type === "subscribe" && message.channel) {
        if (subscribedChannels.size >= maxSubscriptions && !subscribedChannels.has(message.channel)) {
          metrics.rejectedMessages += 1;
          socket.send(JSON.stringify({ type: "error", message: "WebSocket subscription limit reached." }));
          return;
        }

        if (subscribedChannels.has(message.channel)) {
          socket.send(JSON.stringify({ type: "subscribed", channel: message.channel }));
          return;
        }

        const unsubscribe = eventBus.subscribe(message.channel, (event) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(event));
          }
        });
        subscribedChannels.add(message.channel);
        metrics.activeSubscriptions += 1;
        unsubscribeHandlers.push(() => {
          unsubscribe();
          if (subscribedChannels.delete(message.channel)) {
            metrics.activeSubscriptions = Math.max(0, metrics.activeSubscriptions - 1);
          }
        });
        socket.send(JSON.stringify({ type: "subscribed", channel: message.channel }));
      }
    });

    socket.on("close", () => {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
    });
  });

  wss.metricsSnapshot = () => ({ ...metrics });

  return wss;
}
