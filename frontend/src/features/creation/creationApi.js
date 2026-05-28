import { api } from "../../services/api";

export const creationApi = {
  listEngines() {
    return api.get("/creation/engines").then((response) => response.data);
  },

  startRun(payload) {
    return api.post("/creation/runs", payload).then((response) => response.data);
  },
};
