import { api } from "../../services/api";

export const fileApi = {
  upload({ files, workspaceId, projectId, userId }) {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("workspaceId", workspaceId);
    if (projectId) form.append("projectId", projectId);
    if (userId) form.append("userId", userId);
    return api.post("/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((response) => response.data);
  },

  search(params) {
    return api.get("/files/search", { params }).then((response) => response.data);
  },
};
