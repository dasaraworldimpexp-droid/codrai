export class BackupPolicyService {
  constructor({ backupRepository }) {
    this.backupRepository = backupRepository;
  }

  plan({ workspaceId, retentionDays = 30 }) {
    return this.backupRepository?.savePlan?.({
      workspaceId,
      targets: ["postgres", "object_storage", "vector_memory"],
      retentionDays,
      frequency: "daily",
      encryption: "required",
      createdAt: new Date().toISOString(),
    }) || {
      workspaceId,
      targets: ["postgres", "object_storage", "vector_memory"],
      retentionDays,
      frequency: "daily",
      encryption: "required",
    };
  }
}
