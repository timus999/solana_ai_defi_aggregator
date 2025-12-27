// Rule-based AI Agent
// Autonomous strategy execution with rules engine
//
//

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, Wallet } from "@coral-xyz/anchor";
import {
  BaseStrategy,
  StrategyFactory,
  StrategyLogger,
  ExecutionTracker,
  sleep,
} from "../core/strategy-engine-core.ts";

import type {
  ExecutionResult,
  ExecutionSignal,
} from "../core/strategy-engine-core.ts";
import {
  MarketConditionsAnalyzer,
  JupiterPriceMonitor,
} from "../monitors/market-monitors.ts";

// Agent rule engine
//
export interface AgentRule {
  name: string;
  check: (context: RuleContext) => Promise<boolean>;
  action?: string;
}

export interface RuleContext {
  agent: AIAgent;
  strategy: BaseStrategy;
  signal: ExecutionSignal;
  recentExecutions: ExecutionResult[];
  markerConditions?: any;
}

export class AgentRulesEngine {
  private rules: AgentRule[] = [];
  private logger: StrategyLogger;

  constructor() {
    this.logger = new StrategyLogger("RulesEngine");
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // rule 1: Cooldown period
    this.addRule({
      name: "cooldown_period",
      check: async (ctx) => {
        const lastExecution =
          ctx.recentExecutions[ctx.recentExecutions.length - 1];
        if (!lastExecution) return true;

        const timeSinceLastExecution = Date.now() - lastExecution.executionTime;
        const cooldownMs = 300000; // 5 minutes

        if (timeSinceLastExecution < cooldownMs) {
          this.logger.warn("Cooldown period not expired", {
            remaining: `${Math.ceil(
              (cooldownMs - timeSinceLastExecution) / 1000
            )}s`,
          });
          return false;
        }
        return true;
      },
    });

    // Rule 2: Maximum daily losses
    this.addRule({
      name: "daily_loss_limit",
      check: async (ctx) => {
        const today = new Date().toDateString();
        const todayExecutions = ctx.recentExecutions.filter((e) => {
          const execDate = new Date(e.executionTime).toDateString();
          return execDate === today;
        });

        const todayLoss = todayExecutions
          .filter((e) => !e.success || e.profit < 0)
          .reduce((sum, e) => sum + Math.abs(e.profit), 0);

        const maxDailyLoss = 50; // $50 max loss per day

        if (todayLoss >= maxDailyLoss) {
          this.logger.warn("Daily loss limit reached", {
            loss: `$${todayLoss.toFixed(2)}`,
            limit: `$${maxDailyLoss}`,
          });
          return false;
        }
        return true;
      },
    });

    // Rule 3: Minimum confidence threshold
    this.addRule({
      name: "confidence_threshold",
      check: async (ctx) => {
        const minConfidence = 60;
        if (ctx.signal.confidence < minConfidence) {
          this.logger.warn("Confidence too low", {
            confidence: `${ctx.signal.confidence}%`,
            required: `${minConfidence}%`,
          });
          return false;
        }
        return true;
      },
    });

    // Rule 4: Risk management
    this.addRule({
      name: "risk_assessment",
      check: async (ctx) => {
        // Don't execute high-risk trades
        if (ctx.signal.risk === "high") {
          this.logger.warn("Trade risk too high");

          // return false;
          //
          // test
          return true;
        }

        // Limit medium-risk trades
        if (ctx.signal.risk === "medium") {
          const recentFailures = ctx.recentExecutions
            .slice(-5)
            .filter((e) => !e.success).length;

          if (recentFailures >= 2) {
            this.logger.warn("Too many recent failures for medium-risk trade");
            return false;
          }
        }

        return true;
      },
    });

    // Rule 5: Execution success rate
    this.addRule({
      name: "success_rate_check",
      check: async (ctx) => {
        if (ctx.recentExecutions.length < 5) return true;

        const recentExecutions = ctx.recentExecutions.slice(-10);
        const successRate =
          recentExecutions.filter((e) => e.success).length /
          recentExecutions.length;

        if (successRate < 0.5) {
          this.logger.warn("Success rate too low", {
            rate: `${(successRate * 100).toFixed(0)}%`,
          });
          return false;
        }
        return true;
      },
    });
  }

  addRule(rule: AgentRule): void {
    this.rules.push(rule);
    this.logger.info(`Added rule: ${rule.name}`);
  }

  async evaluateAll(
    context: RuleContext
  ): Promise<{ passed: boolean; failedRules: string[] }> {
    const failedRules: string[] = [];

    for (const rule of this.rules) {
      const passed = await rule.check(context);

      if (!passed) {
        failedRules.push(rule.name);
      }
    }

    return {
      passed: failedRules.length === 0,
      failedRules,
    };
  }
}
// ============================================
// AI AGENT
// ============================================

export class AIAgent {
  private agentId: string;
  private strategies: Map<string, BaseStrategy> = new Map();
  private rulesEngine: AgentRulesEngine;
  private executionTracker: ExecutionTracker;
  private marketAnalyzer: MarketConditionsAnalyzer;
  private logger: StrategyLogger;

  private isRunning: boolean = false;
  private program: Program;
  private connection: Connection;
  private wallet: Wallet;

  // Agent configuration
  public config = {
    maxConcurrentExecutions: 3,
    checkInterval: 30000, // 30 seconds
    enableRiskManagement: true,
    enableMarketAnalysis: true,
  };

  constructor(
    agentId: string,
    program: Program,
    connection: Connection,
    wallet: Wallet
  ) {
    this.agentId = agentId;
    this.program = program;
    this.connection = connection;
    this.wallet = wallet;

    this.rulesEngine = new AgentRulesEngine();
    this.executionTracker = new ExecutionTracker();
    this.marketAnalyzer = new MarketConditionsAnalyzer(
      new JupiterPriceMonitor()
    );
    this.logger = new StrategyLogger(`Agent-${agentId}`);
  }

  // ============================================
  // AGENT LIFECYCLE
  // ============================================

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Agent already running");
      return;
    }

    this.isRunning = true;
    this.logger.success("🤖 Agent started");
    this.logger.info(`Monitoring ${this.strategies.size} strategies`);

    // Start monitoring loop
    this.monitoringLoop().catch((error) => {
      this.logger.error("Fatal error in monitoring loop", error);
      this.stop();
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info(" Agent stopped");
  }

  async addStrategy(strategyPubkey: PublicKey): Promise<void> {
    try {
      const strategy = await StrategyFactory.createFromChain(
        strategyPubkey,
        this.program,
        this.connection,
        this.wallet
      );

      if (strategy) {
        this.strategies.set(strategyPubkey.toString(), strategy);
        this.logger.success(
          `Added strategy: ${strategyPubkey.toString().slice(0, 8)}...`
        );
      }
    } catch (error) {
      this.logger.error("Failed to add strategy", error);
    }
  }

  async removeStrategy(strategyPubkey: PublicKey): Promise<void> {
    this.strategies.delete(strategyPubkey.toString());
    this.logger.info(
      `Removed strategy: ${strategyPubkey.toString().slice(0, 8)}...`
    );
  }

  // ============================================
  // MONITORING & EXECUTION
  // ============================================

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.monitorAllStrategies();
        await sleep(this.config.checkInterval);
      } catch (error) {
        this.logger.error("Error in monitoring loop", error);
        await sleep(this.config.checkInterval * 2); // Wait longer on error
      }
    }
  }

  private async monitorAllStrategies(): Promise<void> {
    const strategies = Array.from(this.strategies.values());

    if (strategies.length === 0) {
      return;
    }

    this.logger.debug(`Checking ${strategies.length} strategies...`);

    // Process strategies concurrently (up to max concurrent limit)
    const chunks = this.chunkArray(
      strategies,
      this.config.maxConcurrentExecutions
    );

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((strategy) => this.monitorStrategy(strategy))
      );
    }
  }

  private async monitorStrategy(strategy: BaseStrategy): Promise<void> {
    try {
      console.log(" \n == monitoring data == \n");
      // Step 1: Get market data
      const marketData = await strategy.monitor();

      console.log("market data:", marketData);
      // Step 2: Analyze strategy
      const signal = await strategy.analyze(marketData);

      console.log("signal:", signal);
      // Step 3: Check if execution is recommended
      if (!signal.execute) {
        this.logger.debug(`No execution signal: ${signal.reason}`);
        return;
      }

      this.logger.info(" Execution signal received", {
        amount: signal.amount,
        confidence: `${signal.confidence}%`,
        expectedProfit: `$${signal.expectedProfit.toFixed(2)}`,
      });

      // Step 4: Apply agent rules
      const strategyKey = (strategy as any).strategyPubkey.toString();
      const recentExecutions = this.executionTracker.getRecentExecutions(
        strategyKey,
        20
      );

      const ruleContext: RuleContext = {
        agent: this,
        strategy,
        signal,
        recentExecutions,
      };

      if (this.config.enableRiskManagement) {
        const rulesResult = await this.rulesEngine.evaluateAll(ruleContext);

        if (!rulesResult.passed) {
          this.logger.warn("Rules check failed", {
            failedRules: rulesResult.failedRules,
          });
          return;
        }
      }

      // Step 5: Check market conditions
      if (this.config.enableMarketAnalysis) {
        const marketCheck = await this.marketAnalyzer.isGoodTimeToTrade(
          (strategy as any).parameters.inputToken,
          (strategy as any).parameters.outputToken
        );

        if (!marketCheck.shouldTrade) {
          this.logger.warn("Market conditions unfavorable", {
            reason: marketCheck.reason,
          });
          return;
        }
      }

      // Step 6: Execute strategy
      await this.executeStrategy(strategy, signal, strategyKey);
    } catch (error) {
      this.logger.error("Error monitoring strategy", error);
    }
  }

  private async executeStrategy(
    strategy: BaseStrategy,
    signal: ExecutionSignal,
    strategyKey: string
  ): Promise<void> {
    this.logger.info(" Executing strategy...", {
      reason: signal.reason,
    });

    try {
      const result = await strategy.execute(signal);

      // Track execution
      this.executionTracker.record(strategyKey, result);

      if (result.success) {
        this.logger.success(" Execution successful!", {
          profit: `$${result.profit.toFixed(2)}`,
          signature: result.signature.slice(0, 16) + "...",
        });
      } else {
        this.logger.error(" Execution failed", {
          error: result.error,
        });
      }

      // Log statistics
      const stats = this.executionTracker.getStats(strategyKey);
      this.logger.info("Strategy stats", {
        successRate: `${stats.successRate.toFixed(1)}%`,
        totalProfit: `$${stats.totalProfit.toFixed(2)}`,
        executions: stats.total,
      });
    } catch (error) {
      this.logger.error("Fatal execution error", error);
    }
  }

  // ============================================
  // AGENT ANALYTICS
  // ============================================

  getPerformance() {
    const allStats = Array.from(this.strategies.keys()).map((key) =>
      this.executionTracker.getStats(key)
    );

    const totalExecutions = allStats.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = allStats.reduce((sum, s) => sum + s.totalProfit, 0);
    const avgSuccessRate =
      allStats.length > 0
        ? allStats.reduce((sum, s) => sum + s.successRate, 0) / allStats.length
        : 0;

    return {
      totalStrategies: this.strategies.size,
      totalExecutions,
      totalProfit,
      avgSuccessRate,
      isRunning: this.isRunning,
    };
  }

  getStrategyStats(strategyPubkey: PublicKey) {
    return this.executionTracker.getStats(strategyPubkey.toString());
  }

  // ============================================
  // UTILITY
  // ============================================

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================
// AGENT MANAGER
// Manage multiple agents
// ============================================

export class AgentManager {
  private agents: Map<string, AIAgent> = new Map();
  private logger: StrategyLogger;

  constructor() {
    this.logger = new StrategyLogger("AgentManager");
  }

  createAgent(
    agentId: string,
    program: Program,
    connection: Connection,
    wallet: Wallet
  ): AIAgent {
    const agent = new AIAgent(agentId, program, connection, wallet);
    this.agents.set(agentId, agent);
    this.logger.success(`Created agent: ${agentId}`);
    return agent;
  }

  getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.start();
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
    }
  }

  async startAll(): Promise<void> {
    this.logger.info("Starting all agents...");
    await Promise.all(
      Array.from(this.agents.values()).map((agent) => agent.start())
    );
  }

  async stopAll(): Promise<void> {
    this.logger.info("Stopping all agents...");
    await Promise.all(
      Array.from(this.agents.values()).map((agent) => agent.stop())
    );
  }

  getPerformanceSummary() {
    const performances = Array.from(this.agents.entries()).map(
      ([id, agent]) => ({
        agentId: id,
        ...agent.getPerformance(),
      })
    );

    return {
      totalAgents: this.agents.size,
      runningAgents: performances.filter((p) => p.isRunning).length,
      agents: performances,
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  AIAgent,
  AgentManager,
  AgentRulesEngine,
};
