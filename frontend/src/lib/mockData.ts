import { Agent, Execution, Decision, ActivityItem } from "../types/agent";

export const generateMockData = () => {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  const agents: Agent[] = [
    {
      id: "agent-1",
      name: "Arbitrage Agent Alpha",
      status: "running",
      type: "arbitrage",
      currentAction:
        "Monitoring USDC-SOL spread (0.32%). Waiting for 0.5% minimum...",
      strategies: [
        {
          id: "s1",
          name: "USDC-SOL Arbitrage",
          type: "arbitrage",
          profit: 78.2,
          executions: 23,
          successRate: 91,
        },
        {
          id: "s2",
          name: "USDC-mSOL Arbitrage",
          type: "arbitrage",
          profit: 52.1,
          executions: 18,
          successRate: 89,
        },
        {
          id: "s3",
          name: "SOL-USDT Arbitrage",
          type: "arbitrage",
          profit: 12.2,
          executions: 6,
          successRate: 67,
        },
      ],
      performance: {
        totalProfit: 487.3,
        todayProfit: 142.5,
        executions: 47,
        successRate: 87,
        bestTrade: 12.5,
        worstTrade: -3.2,
        avgProfit: 3.42,
        gasCost: 15.8,
        netProfit: 471.5,
      },
      settings: {
        checkInterval: 30,
        maxPosition: 1000,
        dailyLossLimit: 50,
        cooldownPeriod: 5,
        riskLevel: "low",
        confidenceMin: 60,
        maxSlippage: 0.5,
        minProfit: 0.5,
      },
    },
    {
      id: "agent-2",
      name: "Yield Farmer Beta",
      status: "paused",
      type: "yield_farming",
      currentAction: "Paused: Daily loss limit reached",
      strategies: [
        {
          id: "s4",
          name: "Orca SOL-USDC Pool",
          type: "yield_farming",
          profit: 8.4,
          executions: 2,
          successRate: 100,
        },
      ],
      performance: {
        totalProfit: 124.6,
        todayProfit: 8.4,
        executions: 12,
        successRate: 100,
        bestTrade: 15.8,
        worstTrade: 5.2,
        avgProfit: 10.38,
        gasCost: 3.2,
        netProfit: 121.4,
      },
      settings: {
        checkInterval: 60,
        maxPosition: 2000,
        dailyLossLimit: 50,
        cooldownPeriod: 10,
        riskLevel: "medium",
        confidenceMin: 70,
        maxSlippage: 1.0,
        minProfit: 1.0,
      },
    },
  ];

  const executions: Execution[] = [
    {
      id: "e1",
      timestamp: now - 300000,
      strategyName: "USDC-SOL",
      action: "Swap",
      status: "success",
      profit: 3.42,
      gas: 0.08,
      txHash: "abc123",
    },
    {
      id: "e2",
      timestamp: now - 600000,
      strategyName: "USDC-mSOL",
      action: "Skip",
      status: "skipped",
      profit: 0,
      gas: 0,
      reason: "Spread 0.28% below 0.5% min",
    },
    {
      id: "e3",
      timestamp: now - 900000,
      strategyName: "SOL-USDT",
      action: "Swap",
      status: "success",
      profit: 1.85,
      gas: 0.07,
      txHash: "def456",
    },
    {
      id: "e4",
      timestamp: now - 1200000,
      strategyName: "USDC-SOL",
      action: "Swap",
      status: "failed",
      profit: 0,
      gas: 0.05,
      reason: "Slippage exceeded",
      txHash: "ghi789",
    },
    {
      id: "e5",
      timestamp: now - 1500000,
      strategyName: "USDC-mSOL",
      action: "Swap",
      status: "success",
      profit: 4.12,
      gas: 0.09,
      txHash: "jkl012",
    },
  ];

  const recentDecision: Decision = {
    timestamp: now - 180000,
    strategy: "USDC-SOL Arbitrage",
    decision: "execute",
    marketAnalysis: {
      jupiterPrice: 100.0,
      orcaPrice: 100.52,
      spread: 0.52,
    },
    rulesCheck: {
      cooldown: true,
      dailyLoss: true,
      confidence: true,
      riskLevel: true,
      successRate: true,
    },
    expectedOutcome: {
      amount: 500,
      expectedProfit: 2.6,
      gasCost: 0.1,
      netProfit: 2.5,
    },
    confidence: 78,
  };

  const activityFeed: ActivityItem[] = [
    {
      id: "a1",
      timestamp: now - 30000,
      type: "analyzing",
      message: "Analyzing USDC-SOL spread...",
      badge: "Arbitrage",
    },
    {
      id: "a2",
      timestamp: now - 28000,
      type: "waiting",
      message: "Spread: 0.48% (below 0.5% minimum)",
      badge: "Waiting",
    },
    {
      id: "a3",
      timestamp: now - 5000,
      type: "executing",
      message: "Spread: 0.52% - Executing trade!",
      badge: "Executing",
    },
    {
      id: "a4",
      timestamp: now - 1000,
      type: "success",
      message: "Trade completed: +$3.42 profit",
      badge: "Success",
    },
  ];

  const performanceChart = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    profit: [120, 180, 240, 320, 280, 360, 487.3][i],
  }));

  return { agents, executions, recentDecision, activityFeed, performanceChart };
};
