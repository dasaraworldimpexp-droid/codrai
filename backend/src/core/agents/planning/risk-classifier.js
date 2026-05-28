import { AGENT_RISK_LEVELS } from "../agent-types.js";

export class RiskClassifier {
  async classify({ objective }) {
    const text = String(objective || "").toLowerCase();

    if (/(deploy|delete|charge|payment|refund|publish|send to customer|production|external)/.test(text)) {
      return AGENT_RISK_LEVELS.HIGH;
    }

    if (/(generate files|modify|integrate|automation|database|api key|credential|render|export)/.test(text)) {
      return AGENT_RISK_LEVELS.MEDIUM;
    }

    return AGENT_RISK_LEVELS.LOW;
  }
}
