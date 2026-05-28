import { Server } from "socket.io";
import { getAllowedClientOrigins } from "../config/cors.js";

export function attachSocketIoServer(server, { eventBus, corsOrigin }) {
  const origins = corsOrigin ? [...new Set([corsOrigin, ...getAllowedClientOrigins()])] : getAllowedClientOrigins();
  const io = new Server(server, {
    cors: { origin: origins, credentials: true },
    path: "/socket.io",
  });
  const maxSubscriptions = Number(process.env.SOCKET_IO_MAX_SUBSCRIPTIONS || 50);
  const metrics = {
    activeConnections: 0,
    totalConnections: 0,
    totalSubscriptions: 0,
    rejectedSubscriptions: 0,
  };

  io.engine.on("connection_error", (error) => {
    console.error(`CODRAI Socket.IO connection error: ${error.message}`);
  });

  io.on("connection", (socket) => {
    const unsubscribers = [];
    const subscribedChannels = new Set();
    metrics.activeConnections += 1;
    metrics.totalConnections += 1;

    socket.on("subscribe", ({ channel }) => {
      if (!channel) return;
      if (subscribedChannels.size >= maxSubscriptions && !subscribedChannels.has(channel)) {
        metrics.rejectedSubscriptions += 1;
        socket.emit("error", { message: "Socket.IO subscription limit reached." });
        return;
      }
      if (subscribedChannels.has(channel)) {
        socket.emit("subscribed", { channel });
        return;
      }
      socket.join(channel);
      const unsubscribe = eventBus.subscribe(channel, (event) => io.to(channel).emit("event", event));
      subscribedChannels.add(channel);
      metrics.totalSubscriptions += 1;
      unsubscribers.push(() => {
        unsubscribe();
        subscribedChannels.delete(channel);
      });
      socket.emit("subscribed", { channel });
    });

    socket.on("disconnect", () => {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    });
  });

  io.metricsSnapshot = () => ({ ...metrics });

  return io;
}
