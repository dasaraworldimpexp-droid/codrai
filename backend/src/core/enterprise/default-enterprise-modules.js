import { EnterpriseModuleRegistry } from "./enterprise-module-registry.js";

function createAutonomousBusinessModule(name, description) {
  return {
    name,
    manifest() {
      return { name, description, executionMode: "autonomous_workflow" };
    },
    execute({ goal, input, userId, workspaceId, projectId, autonomousExecutionEngine }) {
      return autonomousExecutionEngine.execute({
        id: `${name}:${Date.now()}`,
        userId,
        workspaceId,
        projectId,
        objective: goal || input?.text,
        metadata: { enterpriseModule: name },
      });
    },
  };
}

export function createDefaultEnterpriseModuleRegistry() {
  const registry = new EnterpriseModuleRegistry();

  [
    ["crm", "Lead, customer, pipeline, ticket, and relationship intelligence."],
    ["erp", "Resource planning, operations, inventory, and process architecture."],
    ["sales_automation", "Sales funnel, outreach, qualification, and follow-up automation."],
    ["marketing_automation", "Campaigns, content calendars, social automation, and analytics."],
    ["team_collaboration", "Tasks, decisions, shared context, and company coordination."],
    ["company_management", "Operating system for goals, teams, projects, and accountability."],
    ["analytics", "AI analytics summaries, KPI monitoring, and insight generation."],
    ["finance", "Finance dashboards, cashflow reasoning, invoicing, and expense intelligence."],
    ["business_intelligence", "BI modeling, reporting, dashboards, and decision support."],
  ].forEach(([name, description]) => registry.register(createAutonomousBusinessModule(name, description)));

  return registry;
}
