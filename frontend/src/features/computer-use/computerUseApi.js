import { api } from "../../services/api";

export const computerUseApi = {
  list({ workspaceId }) {
    return api.get("/computer-use/sessions", { params: { workspaceId } }).then((response) => response.data);
  },

  run(payload) {
    return api.post("/computer-use/sessions", payload).then((response) => response.data);
  },
};
