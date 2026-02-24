import type { ApprovalStore, ApprovalTask } from "@acp/core";

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly map = new Map<string, ApprovalTask>();

  async create(task: ApprovalTask): Promise<void> {
    this.map.set(task.id, { ...task });
  }

  async get(id: string): Promise<ApprovalTask | null> {
    return this.map.get(id) ?? null;
  }

  async setDecision(
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ): Promise<void> {
    const current = this.map.get(id);
    if (!current) return;
    this.map.set(id, {
      ...current,
      status: decision.status,
      decidedBy: decision.decidedBy,
      decisionReason: decision.decisionReason,
      decidedAt: new Date(),
    });
  }

  async markConsumed(id: string, consumedBy: string): Promise<void> {
    const current = this.map.get(id);
    if (!current) return;
    this.map.set(id, {
      ...current,
      status: "consumed",
      consumedAt: new Date(),
      consumedBy,
    });
  }
}
