export class RbacService {
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository;
  }

  async assertPermission({ userId, workspaceId, permission }) {
    const permissions = await this.roleRepository.getPermissions({ userId, workspaceId });
    if (!permissions.includes(permission) && !permissions.includes("*")) {
      throw new Error(`Missing permission: ${permission}`);
    }
    return true;
  }
}
