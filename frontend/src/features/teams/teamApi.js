import { api } from "../../services/api";

export const teamApi = {
  list(params) {
    return api.get("/teams", { params }).then((response) => response.data);
  },

  create(payload) {
    return api.post("/teams", payload).then((response) => response.data);
  },

  message(teamId, payload) {
    return api.post(`/teams/${teamId}/messages`, payload).then((response) => response.data);
  },
};
