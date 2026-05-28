import { create } from "zustand";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SOCKET_URL = API_BASE.replace(/\/api$/, "");
const WS_URL = SOCKET_URL.replace(/^http/, "ws");

export const useRealtimeStore = create((set, get) => ({
  connected: false,
  events: [],
  socket: null,
  connect(channel) {
    const current = get().socket;
    if (current && current.readyState === WebSocket.OPEN) {
      current.send(JSON.stringify({ type: "subscribe", channel }));
      return;
    }
    const socket = new WebSocket(`${WS_URL}/ws`);
    socket.addEventListener("open", () => {
      set({ connected: true });
      socket.send(JSON.stringify({ type: "subscribe", channel }));
    });
    socket.addEventListener("close", () => set({ connected: false, socket: null }));
    socket.addEventListener("error", () => set({ connected: false }));
    socket.addEventListener("message", (message) => {
      try {
        const event = JSON.parse(message.data);
        set((state) => ({ events: [event, ...state.events].slice(0, 100) }));
      } catch {
        set((state) => ({ events: [{ type: "realtime.decode_failed", receivedAt: new Date().toISOString() }, ...state.events].slice(0, 100) }));
      }
    });
    set({ socket });
  },
}));
