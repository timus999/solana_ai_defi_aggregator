export interface Agent {
  id: string;
  name: string;
  status: "running" | "paused" | "stopped";
  type: "arbitrage" | "yield_farming" | "rebalancing";
  strategies: Strategy[];
  performance: AgentPerformance;
  settings: AgentSettings;
  currentAction: string;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  profit: number;
  executions: number;
  successRate: number;
}

export interface AgentPerformance {
  totalProfit: number;
  todayProfit: number;
  executions: number;
  successRate: number;
  bestTrade: number;
  worstTrade: number;
  avgProfit: number;
  gasCost: number;
  netProfit: number;
}

export interface AgentSettings {
  checkInterval: number;
  maxPosition: number;
  dailyLossLimit: number;
  cooldownPeriod: number;
  riskLevel: "low" | "medium" | "high";
  confidenceMin: number;
  maxSlippage: number;
  minProfit: number;
}

export interface Execution {
  id: string;
  timestamp: number;
  strategyName: string;
  action: string;
  status: "success" | "failed" | "skipped";
  profit: number;
  gas: number;
  reason?: string;
  txHash?: string;
}

export interface Decision {
  timestamp: number;
  strategy: string;
  decision: "execute" | "skip";
  marketAnalysis: {
    jupiterPrice: number;
    orcaPrice: number;
    spread: number;
  };
  rulesCheck: {
    cooldown: boolean;
    dailyLoss: boolean;
    confidence: boolean;
    riskLevel: boolean;
    successRate: boolean;
  };
  expectedOutcome: {
    amount: number;
    expectedProfit: number;
    gasCost: number;
    netProfit: number;
  };
  confidence: number;
}

export interface ActivityItem {
  id: string;
  timestamp: number;
  type:
    | "analyzing"
    | "waiting"
    | "executing"
    | "success"
    | "failed"
    | "skipped";
  message: string;
  badge?: string;
}
