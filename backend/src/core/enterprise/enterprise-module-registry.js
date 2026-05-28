export const ENTERPRISE_MODULES = Object.freeze({
  CRM: "crm",
  ERP: "erp",
  SALES_AUTOMATION: "sales_automation",
  MARKETING_AUTOMATION: "marketing_automation",
  TEAM_COLLABORATION: "team_collaboration",
  COMPANY_MANAGEMENT: "company_management",
  ANALYTICS: "analytics",
  FINANCE: "finance",
  BUSINESS_INTELLIGENCE: "business_intelligence",
});

export class EnterpriseModuleRegistry {
  constructor() {
    this.modules = new Map();
  }

  register(module) {
    if (!module?.name || !module?.execute) {
      throw new Error("Enterprise module requires name and execute.");
    }
    this.modules.set(module.name, module);
  }

  get(name) {
    const module = this.modules.get(name);
    if (!module) throw new Error(`Enterprise module is not registered: ${name}`);
    return module;
  }

  list() {
    return [...this.modules.values()].map((module) => module.manifest?.() || { name: module.name });
  }
}
