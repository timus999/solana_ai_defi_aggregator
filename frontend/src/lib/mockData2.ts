export interface Agent {
  id: string;
  name: string;
  status: "running" | "paused" | "stopped";
  type: "arbitrage" | "yield_farming" | "rebalancing";
  strategies: Strategy[];
  performance: AgentPerformance;
  settings: AgentSettings;
  currentAction: string;
  createdAt: number;
  lastExecutionTime: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  profit: number;
  executions: number;
  successRate: number;
  lastProfit: number;
  avgProfitPerExecution: number;
}

export interface AgentPerformance {
  totalProfit: number;
  todayProfit: number;
  weekProfit: number;
  monthProfit: number;
  executions: number;
  successRate: number;
  bestTrade: number;
  worstTrade: number;
  avgProfit: number;
  gasCost: number;
  netProfit: number;
  roi: number;
  sharpeRatio: number;
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
  autoRestart: boolean;
  stopLossPercentage: number;
}

export interface Execution {
  id: string;
  agentId: string;
  strategyId: string;
  timestamp: number;
  strategyName: string;
  action: string;
  status: "success" | "failed" | "skipped" | "pending";
  profit: number;
  gas: number;
  reason?: string;
  txHash?: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  slippage: number;
}

export interface Decision {
  id: string;
  timestamp: number;
  strategy: string;
  decision: "execute" | "skip";
  marketAnalysis: {
    jupiterPrice: number;
    orcaPrice: number;
    raydiumPrice?: number;
    spread: number;
    spreadBps: number;
    volume24h: number;
    liquidity: number;
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
    roi: number;
  };
  confidence: number;
  risk: "low" | "medium" | "high";
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
    | "skipped"
    | "error"
    | "paused";
  message: string;
  badge?: string;
  metadata?: any;
}

// ==================== DATA GENERATORS ====================

export class MockDataGenerator {
  private static idCounter = 0;

  static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++this.idCounter}`;
  }

  static randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(this.randomBetween(min, max));
  }

  static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate realistic execution history
  static generateExecutions(count: number, agentId: string): Execution[] {
    const executions: Execution[] = [];
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    const strategies = [
      { name: "USDC-SOL", input: "USDC", output: "SOL" },
      { name: "USDC-mSOL", input: "USDC", output: "mSOL" },
      { name: "SOL-USDT", input: "SOL", output: "USDT" },
      { name: "USDC-RAY", input: "USDC", output: "RAY" },
    ];

    for (let i = 0; i < count; i++) {
      const strategy = this.randomChoice(strategies);
      const timestamp = now - this.randomInt(0, 7 * dayInMs);
      const status = this.randomChoice<Execution["status"]>([
        "success",
        "success",
        "success",
        "failed",
        "skipped",
      ]);

      let profit = 0;
      let gas = 0;
      let reason = undefined;
      let txHash = undefined;

      if (status === "success") {
        profit = this.randomBetween(0.5, 15);
        gas = this.randomBetween(0.05, 0.15);
        txHash = this.generateTxHash();
      } else if (status === "failed") {
        gas = this.randomBetween(0.03, 0.08);
        reason = this.randomChoice([
          "Slippage exceeded",
          "Insufficient liquidity",
          "Transaction timeout",
          "Price moved during execution",
        ]);
        txHash = this.generateTxHash();
      } else if (status === "skipped") {
        reason = this.randomChoice([
          `Spread ${this.randomBetween(0.1, 0.4).toFixed(2)}% below minimum`,
          "Cooldown period active",
          "Daily loss limit approaching",
          "Low confidence score",
        ]);
      }

      executions.push({
        id: this.generateId("exec"),
        agentId,
        strategyId: this.generateId("strategy"),
        timestamp,
        strategyName: strategy.name,
        action: status === "skipped" ? "Skip" : "Swap",
        status,
        profit,
        gas,
        reason,
        txHash,
        inputToken: strategy.input,
        outputToken: strategy.output,
        inputAmount: this.randomBetween(100, 1000),
        outputAmount: 0,
        priceImpact: this.randomBetween(0.01, 0.5),
        slippage: this.randomBetween(0.05, 0.3),
      });
    }

    return executions.sort((a, b) => b.timestamp - a.timestamp);
  }

  static generateTxHash(): string {
    const chars = "0123456789abcdef";
    let hash = "";
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  // Generate agent with realistic data
  static generateAgent(type: Agent["type"], index: number): Agent {
    const names = {
      arbitrage: [
        "Arbitrage Agent Alpha",
        "Arb Hunter Beta",
        "Spread Seeker Gamma",
      ],
      yield_farming: [
        "Yield Farmer Beta",
        "APY Maximizer",
        "Liquidity Provider Pro",
      ],
      rebalancing: [
        "Portfolio Rebalancer",
        "Balance Keeper",
        "Allocation Manager",
      ],
    };

    const strategies: Strategy[] = [];
    const strategyCount = this.randomInt(2, 4);

    for (let i = 0; i < strategyCount; i++) {
      strategies.push({
        id: this.generateId("strategy"),
        name: this.generateStrategyName(type, i),
        type,
        profit: this.randomBetween(10, 150),
        executions: this.randomInt(5, 50),
        successRate: this.randomInt(65, 95),
        lastProfit: this.randomBetween(-2, 8),
        avgProfitPerExecution: this.randomBetween(1, 5),
      });
    }

    const totalProfit = strategies.reduce((sum, s) => sum + s.profit, 0);
    const totalExecutions = strategies.reduce(
      (sum, s) => sum + s.executions,
      0
    );
    const avgSuccessRate =
      strategies.reduce((sum, s) => sum + s.successRate, 0) / strategies.length;

    return {
      id: this.generateId("agent"),
      name: names[type][index % names[type].length],
      status: this.randomChoice<Agent["status"]>([
        "running",
        "running",
        "paused",
      ]),
      type,
      strategies,
      performance: {
        totalProfit,
        todayProfit: this.randomBetween(0, totalProfit * 0.1),
        weekProfit: this.randomBetween(0, totalProfit * 0.3),
        monthProfit: totalProfit,
        executions: totalExecutions,
        successRate: Math.round(avgSuccessRate),
        bestTrade: this.randomBetween(10, 25),
        worstTrade: this.randomBetween(-5, -1),
        avgProfit: totalProfit / totalExecutions,
        gasCost: totalExecutions * 0.08,
        netProfit: totalProfit - totalExecutions * 0.08,
        roi: this.randomBetween(5, 25),
        sharpeRatio: this.randomBetween(1.2, 2.8),
      },
      settings: {
        checkInterval:
          type === "arbitrage" ? 30 : type === "yield_farming" ? 60 : 45,
        maxPosition: this.randomInt(500, 2000),
        dailyLossLimit: 50,
        cooldownPeriod: type === "arbitrage" ? 5 : 10,
        riskLevel: this.randomChoice<"low" | "medium" | "high">([
          "low",
          "medium",
        ]),
        confidenceMin: this.randomInt(60, 80),
        maxSlippage: this.randomBetween(0.3, 1.0),
        minProfit: this.randomBetween(0.3, 0.8),
        autoRestart: true,
        stopLossPercentage: this.randomBetween(2, 5),
      },
      currentAction: this.generateCurrentAction(type),
      createdAt: Date.now() - this.randomInt(1, 30) * 24 * 60 * 60 * 1000,
      lastExecutionTime: Date.now() - this.randomInt(1, 60) * 60 * 1000,
    };
  }

  static generateStrategyName(type: Agent["type"], index: number): string {
    const pairs = ["USDC-SOL", "USDC-mSOL", "SOL-USDT", "USDC-RAY", "SOL-ETH"];

    if (type === "arbitrage") {
      return `${pairs[index % pairs.length]} Arbitrage`;
    } else if (type === "yield_farming") {
      return `${this.randomChoice(["Orca", "Raydium", "Saber"])} ${
        pairs[index % pairs.length]
      } Pool`;
    } else {
      return `${pairs[index % pairs.length]} Rebalancing`;
    }
  }

  static generateCurrentAction(type: Agent["type"]): string {
    if (type === "arbitrage") {
      return this.randomChoice([
        "Monitoring USDC-SOL spread (0.32%). Waiting for 0.5% minimum...",
        "Executing arbitrage trade on USDC-mSOL pair...",
        "Analyzing DEX prices across Jupiter, Orca, and Raydium...",
        "Cooldown active. Next check in 3 minutes.",
      ]);
    } else if (type === "yield_farming") {
      return this.randomChoice([
        "Monitoring APY across liquidity pools...",
        "Providing liquidity to Orca SOL-USDC pool (28% APY)",
        "Evaluating impermanent loss risk...",
        "Harvesting rewards from active positions...",
      ]);
    } else {
      return this.randomChoice([
        "Portfolio allocation: 40% USDC, 35% SOL, 25% mSOL - Balanced ✓",
        "Detecting 8% deviation in SOL allocation. Rebalancing needed.",
        "Monitoring portfolio drift...",
        "All allocations within 5% threshold. No action needed.",
      ]);
    }
  }

  // Generate performance chart data
  static generatePerformanceChart(
    days: number = 7
  ): Array<{ day: string; profit: number; executions: number }> {
    const data = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let cumulativeProfit = 0;

    for (let i = 0; i < days; i++) {
      const dailyProfit = this.randomBetween(20, 80);
      cumulativeProfit += dailyProfit;

      data.push({
        day: dayNames[i % 7],
        profit: Math.round(cumulativeProfit * 100) / 100,
        executions: this.randomInt(3, 15),
      });
    }

    return data;
  }

  // Generate activity feed
  static generateActivityFeed(count: number = 20): ActivityItem[] {
    const activities: ActivityItem[] = [];
    const now = Date.now();

    const templates = [
      {
        type: "analyzing" as const,
        message: "Analyzing {pair} spread...",
        badge: "Arbitrage",
      },
      {
        type: "waiting" as const,
        message: "Spread: {spread}% (below minimum)",
        badge: "Waiting",
      },
      {
        type: "executing" as const,
        message: "Executing trade on {pair}!",
        badge: "Executing",
      },
      {
        type: "success" as const,
        message: "Trade completed: +${profit} profit",
        badge: "Success",
      },
      {
        type: "failed" as const,
        message: "Trade failed: {reason}",
        badge: "Failed",
      },
      {
        type: "skipped" as const,
        message: "Skipped: {reason}",
        badge: "Skipped",
      },
    ];

    for (let i = 0; i < count; i++) {
      const template = this.randomChoice(templates);
      const message = template.message
        .replace(
          "{pair}",
          this.randomChoice(["USDC-SOL", "USDC-mSOL", "SOL-USDT"])
        )
        .replace("{spread}", this.randomBetween(0.1, 0.8).toFixed(2))
        .replace("{profit}", this.randomBetween(1, 10).toFixed(2))
        .replace(
          "{reason}",
          this.randomChoice([
            "Low liquidity",
            "Slippage too high",
            "Confidence below threshold",
          ])
        );

      activities.push({
        id: this.generateId("activity"),
        timestamp: now - i * this.randomInt(30000, 300000),
        type: template.type,
        message,
        badge: template.badge,
        metadata: {},
      });
    }

    return activities;
  }

  // Generate decision with full details
  static generateDecision(): Decision {
    const jupiterPrice = 100 + this.randomBetween(-5, 5);
    const orcaPrice = jupiterPrice * (1 + this.randomBetween(0.001, 0.015));
    const spread = ((orcaPrice - jupiterPrice) / jupiterPrice) * 100;

    const shouldExecute = spread > 0.5 && this.randomBetween(0, 1) > 0.3;

    return {
      id: this.generateId("decision"),
      timestamp: Date.now() - this.randomInt(60000, 3600000),
      strategy: "USDC-SOL Arbitrage",
      decision: shouldExecute ? "execute" : "skip",
      marketAnalysis: {
        jupiterPrice,
        orcaPrice,
        raydiumPrice: jupiterPrice * (1 + this.randomBetween(-0.005, 0.01)),
        spread,
        spreadBps: spread * 100,
        volume24h: this.randomInt(1000000, 10000000),
        liquidity: this.randomInt(500000, 5000000),
      },
      rulesCheck: {
        cooldown: true,
        dailyLoss: true,
        confidence: shouldExecute,
        riskLevel: true,
        successRate: true,
      },
      expectedOutcome: {
        amount: 500,
        expectedProfit: (500 * spread) / 100,
        gasCost: 0.1,
        netProfit: (500 * spread) / 100 - 0.1,
        roi: spread - 0.02,
      },
      confidence: shouldExecute
        ? this.randomInt(65, 85)
        : this.randomInt(30, 59),
      risk: spread > 2 ? "high" : spread > 1 ? "medium" : "low",
    };
  }

  // Generate complete mock dataset
  static generateCompleteDataset() {
    const agents = [
      this.generateAgent("arbitrage", 0),
      this.generateAgent("yield_farming", 0),
      this.generateAgent("rebalancing", 0),
    ];

    const executions = this.generateExecutions(50, agents[0].id);
    const activityFeed = this.generateActivityFeed(20);
    const decision = this.generateDecision();
    const performanceChart = this.generatePerformanceChart(7);

    return {
      agents,
      executions,
      activityFeed,
      decision,
      performanceChart,
    };
  }
}
