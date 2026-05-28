import { api } from "../../services/api";

export const chatApi = {
  listConversations(params) {
    return api.get("/conversations", { params }).then((response) => response.data);
  },

  createConversation(payload) {
    return api.post("/conversations", payload).then((response) => response.data);
  },

  messages(conversationId, params) {
    return api.get(`/conversations/${conversationId}/messages`, { params }).then((response) => response.data);
  },

  appendUserMessage(conversationId, payload) {
    return api.post(`/conversations/${conversationId}/messages`, payload).then((response) => response.data);
  },

  archiveConversation(conversationId, payload) {
    return api.post(`/conversations/${conversationId}/archive`, payload).then((response) => response.data);
  },

  deleteConversation(conversationId, payload) {
    return api.delete(`/conversations/${conversationId}`, { data: payload }).then((response) => response.data);
  },
};
