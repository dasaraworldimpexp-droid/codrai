import { api } from "../../services/api";

export const brainApi = {
  capabilities() {
    return api.get("/brain/capabilities").then((response) => response.data);
  },

  execute(payload) {
    return api.post("/brain/execute", payload).then((response) => response.data);
  },
};
