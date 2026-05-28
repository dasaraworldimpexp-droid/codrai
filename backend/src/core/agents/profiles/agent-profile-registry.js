import { AGENT_PROFILES } from "./agent-profiles.js";

export class AgentProfileRegistry {
  constructor(profiles = AGENT_PROFILES) {
    this.profiles = new Map(Object.entries(profiles));
  }

  get(agentType) {
    return this.profiles.get(agentType);
  }

  list() {
    return [...this.profiles.values()];
  }

  register(profile) {
    if (!profile?.type) {
      throw new Error("Agent profile requires a type.");
    }

    this.profiles.set(profile.type, profile);
  }
}
