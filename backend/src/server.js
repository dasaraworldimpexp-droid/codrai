import dotenv from "dotenv";
import http from "node:http";
import app from "./app.js";
import { configureProductionRuntime } from "./bootstrap/runtime-bootstrap.js";
import { attachRealtimeWebSocketServer } from "./realtime/websocket-server.js";
import { attachSocketIoServer } from "./realtime/socketio-server.js";

dotenv.config();
const locals = configureProductionRuntime(app);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

app.locals.websocketServer = attachRealtimeWebSocketServer(server, { eventBus: locals.eventBus });
app.locals.socketIoServer = attachSocketIoServer(server, { eventBus: locals.eventBus, corsOrigin: process.env.CLIENT_URL });

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`CODRAI API port ${PORT} is already in use. Stop the existing process or set PORT to an available port.`);
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});

server.listen(PORT, () => {
  console.log(`CODRAI API running on http://localhost:${PORT}`);
  console.log(`CODRAI realtime WebSocket running on ws://localhost:${PORT}/ws`);
});
