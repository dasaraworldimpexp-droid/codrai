import { api } from "../../services/api";

export const analyticsApi = {
  usage(params) {
    return api.get("/analytics/usage", { params }).then((response) => response.data);
  },
};
