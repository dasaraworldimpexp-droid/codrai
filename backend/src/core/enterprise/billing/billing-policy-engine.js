export class BillingPolicyEngine {
  constructor({ subscriptionRepository, usageRepository }) {
    this.subscriptionRepository = subscriptionRepository;
    this.usageRepository = usageRepository;
  }

  async assertEntitled({ workspaceId, feature, estimatedCredits = 0 }) {
    const subscription = await this.subscriptionRepository?.getActive?.({ workspaceId });
    const usage = await this.usageRepository?.currentPeriod?.({ workspaceId });

    if (!subscription) {
      throw new Error("No active subscription found for workspace.");
    }

    if (subscription.features && !subscription.features.includes(feature) && !subscription.features.includes("*")) {
      throw new Error(`Subscription does not include feature: ${feature}`);
    }

    if (usage && subscription.creditLimit !== undefined && usage.credits + estimatedCredits > subscription.creditLimit) {
      throw new Error("Workspace credit limit exceeded.");
    }

    return { subscription, usage };
  }
}
