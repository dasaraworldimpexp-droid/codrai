import { api } from "../../services/api";

export const securityApi = {
  trustReport() {
    return api.get("/security/trust-report").then((response) => response.data);
  },
};
