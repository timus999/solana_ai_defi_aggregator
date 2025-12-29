import {
  MockDataGenerator,
  Agent,
  Execution,
  AgentSettings,
} from "./mockData2";

export class AgentAPI {
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async getAgents(): Promise<Agent[]> {
    await this.delay(500);
    const data = MockDataGenerator.generateCompleteDataset();
    return data.agents;
  }

  static async getAgent(id: string): Promise<Agent> {
    await this.delay(300);
    return MockDataGenerator.generateAgent("arbitrage", 0);
  }

  static async getExecutions(
    agentId: string,
    limit: number = 50
  ): Promise<Execution[]> {
    await this.delay(400);
    return MockDataGenerator.generateExecutions(limit, agentId);
  }

  static async toggleAgent(
    agentId: string
  ): Promise<{ success: boolean; status: Agent["status"] }> {
    await this.delay(200);
    return {
      success: true,
      status: MockDataGenerator.randomChoice<Agent["status"]>([
        "running",
        "paused",
      ]),
    };
  }

  static async updateSettings(
    agentId: string,
    settings: AgentSettings
  ): Promise<{ success: boolean }> {
    await this.delay(300);
    console.log("Updating agent settings:", agentId, settings);
    return { success: true };
  }

  static async getPerformanceMetrics(
    agentId: string,
    days: number = 7
  ): Promise<any> {
    await this.delay(400);
    return MockDataGenerator.generatePerformanceChart(days);
  }
}
