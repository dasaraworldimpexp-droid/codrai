import { api } from "../../services/api";

export const enterpriseApi = {
  modules() {
    return api.get("/enterprise/modules").then((response) => response.data);
  },

  execute(payload) {
    return api.post("/enterprise/actions", payload).then((response) => response.data);
  },
};
