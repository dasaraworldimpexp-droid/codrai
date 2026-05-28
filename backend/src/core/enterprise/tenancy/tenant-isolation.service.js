export class TenantIsolationService {
  assertWorkspaceScope({ actor, workspaceId, resource }) {
    if (!workspaceId) throw new Error("Workspace scope is required.");
    if (resource?.workspaceId && resource.workspaceId !== workspaceId) {
      throw new Error("Workspace isolation violation.");
    }
    if (actor?.workspaceIds && !actor.workspaceIds.includes(workspaceId)) {
      throw new Error("Actor is not a member of this workspace.");
    }
    return true;
  }
}
