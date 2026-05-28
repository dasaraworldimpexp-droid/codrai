import { api } from "../../services/api";

export const employeeApi = {
  list({ workspaceId }) {
    return api.get("/employees", { params: { workspaceId } }).then((response) => response.data);
  },

  create(payload) {
    return api.post("/employees", payload).then((response) => response.data);
  },

  assign({ workspaceId, userId, employeeId, objective }) {
    return api.post(`/employees/${employeeId}/assignments`, { workspaceId, userId, objective }).then((response) => response.data);
  },
};
