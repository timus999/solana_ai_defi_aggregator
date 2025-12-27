// Strategy Implementation
//
//
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  BaseStrategy,
  StrategyLogger,
  strategyRegistry,
} from "../core/strategy-engine-core.ts";

import type {
  MarketData,
  ExecutionResult,
  ExecutionSignal,
} from "../core/strategy-engine-core.ts";
import {
  JupiterPriceMonitor,
  MultiDexPriceMonitor,
  PortfolioMonitor,
  APYMonitor,
  MarketConditionsAnalyzer,
} from "../monitors/market-monitors.ts";
import fetch from "node-fetch";

// Arbitrage Strategy
//
// Buy low on one DEX, sell high on another
//
export class ArbitrageStrategy extends BaseStrategy {
  private priceMonitor: MultiDexPriceMonitor;
  private logger: StrategyLogger;

  constructor(
    strategyPubkey: PublicKey,
    program: any,
    connection: any,
    wallet: any,
    parameters: any
  ) {
    super(strategyPubkey, program, connection, wallet, parameters);

    this.priceMonitor = new MultiDexPriceMonitor();
    this.logger = new StrategyLogger("Arbitrage");
  }

  async analyze(marketData: MarketData[]): Promise<ExecutionSignal> {
    this.logger.info("Analyzing arbitrage oppurtunity...");

    try {
      // Get prices across multple DEXs
      const prices = await this.priceMonitor.getPriceAcrossDexes(
        this.parameters.inputToken,
        this.parameters.outputToken
      );

      this.logger.debug("Price spread", {
        best: prices.best.price,
        worst: prices.worst.price,
        spreadBps: prices.spreadBps,
      });

      // Check if spread is profitable
      //
      console.log("spreadBps", prices.spreadBps);
      console.log("minProfitBps", this.parameters.minProfitBps);

      const isProfitable = prices.spreadBps >= this.parameters.minProfitBps;

      if (!isProfitable) {
        return {
          execute: false,
          amount: 0,
          reason: `Spread ${prices.spreadBps.toFixed(0)} bps  < minimum ${
            this.parameters.minProfitBps
          } bps`,
          confidence: 0,
          expectedProfit: 0,
          risk: "low",
        };
      }

      // Calculate optimal trade amount
      console.log("Max position size", this.parameters.maxPositionSize);
      const amount = Math.min(
        this.parameters.maxPositionSize * 1e6, // convert to lamports
        1000 * 1e6 // Max 1000 USDC per trade
      );

      console.log("amount: ", amount);

      // Estimate profit
      const expectedProfit = (amount * prices.spreadBps) / 10000 / 1e6;

      console.log("expectedProfit: ", expectedProfit);
      // Calculate confidence based on spread size
      const confidence = Math.min(
        100,
        (prices.spreadBps / this.parameters.minProfitBps) * 60 + 40
      );

      // Determine risk level
      let risk: "low" | "medium" | "high" = "low";
      if (prices.spreadBps > 200) risk = "high";
      else if (prices.spreadBps > 100) risk = "medium";

      this.logger.success("Arbitrage oppurtunity found!", {
        spreadBps: prices.spreadBps,
        expectedProfit: `${expectedProfit.toFixed(2)}`,
        confidence: `${confidence.toFixed(0)}%`,
      });

      return {
        execute: true,
        amount: amount / 1e6, // convert back to USDC
        reason: `Profitable spread of ${prices.spreadBps.toFixed(
          0
        )} bps detected`,
        confidence,
        expectedProfit,
        risk,
        metadata: { prices },
      };
    } catch (error) {
      this.logger.error("Error Analyzing arbitrage", error);
      return {
        execute: false,
        amount: 0,
        reason: "Error Analyzing Arbitrage",
        confidence: 0,
        expectedProfit: 0,
        risk: "high",
      };
    }
  }

  async execute(signal: ExecutionSignal): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.logger.info("Executing arbitrage trade...", {
      amount: signal.amount,
      expectedProfit: signal.expectedProfit,
    });

    try {
      // Step 1: Get Jupiter quote
      // const quote = await this.getJupiterQuote(
      //   this.parameters.inputToken,
      //   this.parameters.outputToken,
      //   Math.floor(signal.amount * 1e6) // Convert to lamports
      // );

      // console.log("quote", quote);

      // Step 2: Execute swap via program
      const signature = await this.executeVaultStrategy(
        Math.floor(signal.amount * 1e6),

        // parseInt(quote.otherAmountThreshold),
        5,
        // Buffer.from(quote.swapTransaction, "base64"),
        // test
        Buffer.from("test", "base64"),
        // quote.accountMetas.map((a: any) => a.pubkey)
        // test
        []
      );

      this.logger.success("Trade executed!", { signature });

      // Step 3: Calculate actual profit
      // const outputAmount = parseInt(quote.outAmount) / 1e6;
      const outputAmount = 5;
      const actualProfit = outputAmount - signal.amount;

      const result: ExecutionResult = {
        success: true,
        signature,
        inputAmount: signal.amount,
        outputAmount,
        profit: actualProfit,
        gasCost: 0.000005 * 100,
        executionTime: Date.now() - startTime,
      };

      // Record on-chain
      await this.recordExecution(result);

      return result;
    } catch (error: any) {
      this.logger.error("Trade failed", error);

      return {
        success: false,
        signature: "",
        inputAmount: signal.amount,
        outputAmount: 0,
        profit: 0,
        gasCost: 0.000005 * 100,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async getJupiterQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number
  ): Promise<any> {
    const response = await fetch(
      `https://api.jup.ag/swap/v1/quote?cluster=devnet&slippageBps=${this.parameters.maxSlippageBps}` +
        `&swapMode=ExactIn&restrictIntermediateTokens=true&maxAccounts=64&instructionVersion=V1&` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}`,
      {
        method: "GET",
        headers: {
          "x-api-key": process.env.JUPITER_API_KEY!,
        },
      }
    );
    return response.json();
  }

  private async executeVaultStrategy(
    amount: number,
    minOutput: number,
    swapData: Buffer,
    accounts: PublicKey[]
  ): Promise<string> {
    // This will call programs' execute_strategy instruction
    //
    // for now, return mock signature
    return "MOCK_TX_SIGNATURE_" + Date.now();
  }
}

export class YieldFarmingStrategy extends BaseStrategy {
  private apyMonitor: APYMonitor;
  private portfolioMonitor: PortfolioMonitor;
  private logger: StrategyLogger;

  private currentPool: PublicKey | null = null;
  private targetAPY: number;

  constructor(
    wallet: any,
    connection: any,
    program: any,
    programId: any,
    parameters: any
  ) {
    super(wallet, connection, program, programId, parameters);
    this.apyMonitor = new APYMonitor();
    this.portfolioMonitor = new PortfolioMonitor(this.connection);
    this.logger = new StrategyLogger("YieldFarming");
    this.targetAPY = 10; // 10% minimum APY
  }

  async analyze(marketData: MarketData[]): Promise<ExecutionSignal> {
    this.logger.info("Analyzing yiedl opportunities...");

    try {
      // List of known high-yield pools (would fetch from API in production)
      const pools: any[] = [
        // Kamino USDC-USDT
        // Orca SOL-USDC
        // Raydium mSOL-SOL
        // for demo, using mock address
      ];

      if (pools.length === 0) {
        return {
          execute: false,
          amount: 0,
          reason: "No pools configured",
          confidence: 0,
          expectedProfit: 0,
          risk: "low",
        };
      }

      // find best yield oppurtunity
      const bestPool = await this.apyMonitor.getBestYieldOppurtunity(pools);

      if (!bestPool || bestPool.apy < this.targetAPY) {
        return {
          execute: false,
          amount: 0,
          reason: `Best APY ${bestPool?.apy.toFixed(1)} % < target ${
            this.targetAPY
          }%`,
          confidence: 0,
          expectedProfit: 0,
          risk: "low",
        };
      }

      this.logger.success("High yield pool found!", {
        pool: bestPool.pool.toString().slice(0, 8),
        apy: `${bestPool.apy.toFixed(1)}%`,
      });

      // Calculate how much to allocate
      const amount = Math.min(
        this.parameters.maxPositionSize,
        500 // Max $500 per pool
      );

      // Estimate annual profit
      const expectedAnnualProfit = (amount * bestPool.apy) / 100;

      return {
        execute: true,
        amount,
        reason: `High APY pool found:  ${bestPool.apy.toFixed(1)} %`,
        confidence: 80,
        expectedProfit: expectedAnnualProfit / 365, // Daily profit
        risk: bestPool.apy > 50 ? "high" : "medium",
        metadata: { pool: bestPool.pool, apy: bestPool.apy },
      };
    } catch (error) {
      this.logger.error("Error analyzing yield", error);
      return {
        execute: false,
        amount: 0,
        reason: "Error analyzing yield",
        confidence: 0,
        expectedProfit: 0,
        risk: "high",
      };
    }
  }

  async execute(signal: ExecutionSignal): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.logger.info("Providing liquidity...", {
      amount: signal.amount,
      pool: signal.metadata?.pool,
    });

    try {
      // In production, this would:
      // 1. Swap half to pair inputToken
      // 2. Add liquidity to the pool
      // 3. Stake LP tokens
      //
      //
      // For demo, return mock result
      const result: ExecutionResult = {
        success: true,
        signature: "MOCK_YIELD_SIGNATURE_" + Date.now(),
        inputAmount: signal.amount,
        outputAmount: signal.amount,
        profit: 0, // Yield earn over time
        gasCost: 0.001 * 100,
        executionTime: Date.now() - startTime,
      };

      this.currentPool = signal.metadata?.pool;
      this.logger.success("Liquidity provided!");

      return result;
    } catch (error: any) {
      this.logger.error("Failed to provide lidquity", error);

      return {
        success: false,
        signature: "",
        inputAmount: signal.amount,
        outputAmount: 0,
        profit: 0,
        gasCost: 0.001 * 100,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // Rebalancing Strategy
  // Maintain target portfolio allocations
  //
  //
}

export class RebalancingStrategy extends BaseStrategy {
  private portfolioMonitor: PortfolioMonitor;
  private priceMonitor: JupiterPriceMonitor;
  private logger: StrategyLogger;

  // Target allocations (would be loaded from strategy parameters)
  private targetAllocations: Map<string, number> = new Map([
    ["USDC", 40], // 40%
    ["SOL", 30], // 30%
    ["mSOL", 30], // 30%
  ]);

  private rebalanceThreshold: number = 5; // 5% deviation triggers rebalance

  constructor(
    wallet: any,
    connection: any,
    program: any,
    programId: any,
    parameters: any
  ) {
    super(wallet, connection, program, programId, parameters);
    this.portfolioMonitor = new PortfolioMonitor(this.connection);
    this.priceMonitor = new JupiterPriceMonitor();
    this.logger = new StrategyLogger("Rebalancing");
  }

  async analyze(marketData: MarketData[]): Promise<ExecutionSignal> {
    this.logger.info("Analyzing portfolio balance...");

    try {
      // Get current portfolio
      const portfolio = await this.portfolioMonitor.getPortfolio(
        this.wallet.publicKey,
        [this.parameters.inputToken, this.parameters.outputToken]
      );

      // Calculate total value
      let totalValue = 0;
      const currentAllocations = new Map<string, number>();

      for (const [mint, balance] of portfolio.entries()) {
        // Get value in USDC
        const value = balance / 1e6; // Simplified
        totalValue += value;
      }

      // Calculate current allocation percentages
      for (const [mint, balance] of portfolio.entries()) {
        const value = balance / 1e6;
        const percentage = (value / totalValue) * 100;
        currentAllocations.set(mint, percentage);
      }

      // Check deviations
      let maxDeviation = 0;
      let needsRebalance = false;

      for (const [token, targetPct] of this.targetAllocations.entries()) {
        const currentPct = currentAllocations.get(token) || 0;
        const deviation = Math.abs(currentPct - targetPct);

        if (deviation > maxDeviation) {
          maxDeviation = deviation;
        }

        if (deviation > this.rebalanceThreshold) {
          needsRebalance = true;
        }
      }

      if (!needsRebalance) {
        return {
          execute: false,
          amount: 0,
          reason: `Portfolio balanced (max deviation: ${maxDeviation.toFixed(
            1
          )}%)`,
          confidence: 0,
          expectedProfit: 0,
          risk: "low",
        };
      }

      this.logger.success("Rebalancing needed!", {
        maxDeviation: `${maxDeviation.toFixed(1)}%`,
        threshold: `${this.rebalanceThreshold}%`,
      });

      // Calculate rebalancing trades
      const amount = Math.min(
        totalValue * 0.1, // Rebalance 10% at a time
        this.parameters.maxPositionSize
      );

      return {
        execute: true,
        amount,
        reason: `Portfolio deviation ${maxDeviation.toFixed(1)}% exceeds ${
          this.rebalanceThreshold
        }%`,
        confidence: 90,
        expectedProfit: 0, // Rebalancing is for risk management, not profit
        risk: "low",
        metadata: {
          currentAllocations,
          targetAllocations: this.targetAllocations,
        },
      };
    } catch (error) {
      this.logger.error("Error analyzing portfolio", error);
      return {
        execute: false,
        amount: 0,
        reason: "Analysis failed",
        confidence: 0,
        expectedProfit: 0,
        risk: "high",
      };
    }
  }

  async execute(signal: ExecutionSignal): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.logger.info("Rebalancing portfolio...", {
      amount: signal.amount,
    });

    try {
      // In production, this would:
      // 1. Calculate which tokens to sell/buy
      // 2. Execute multiple swaps
      // 3. Verify new allocations

      // For demo, return mock result
      const result: ExecutionResult = {
        success: true,
        signature: "MOCK_REBALANCE_TX_" + Date.now(),
        inputAmount: signal.amount,
        outputAmount: signal.amount,
        profit: 0,
        gasCost: 0.002 * 100, // Higher gas for multiple txs
        executionTime: Date.now() - startTime,
      };

      this.logger.success("Portfolio rebalanced!");

      return result;
    } catch (error: any) {
      this.logger.error("Rebalancing failed", error);

      return {
        success: false,
        signature: "",
        inputAmount: signal.amount,
        outputAmount: 0,
        profit: 0,
        gasCost: 0.002 * 100,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}

// Register All strategies
strategyRegistry.register("arbitrage", ArbitrageStrategy);
strategyRegistry.register("yieldfarming", YieldFarmingStrategy);
strategyRegistry.register("rebalancing", RebalancingStrategy);

export default {
  ArbitrageStrategy,
  YieldFarmingStrategy,
  RebalancingStrategy,
};
