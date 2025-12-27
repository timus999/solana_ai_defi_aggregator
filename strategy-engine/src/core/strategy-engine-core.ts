// Strategy Engine - core system
//
//
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";

// Type & Interfaces
//

export interface StrategyParameters {
  inputToken: PublicKey;
  outputToken: PublicKey;
  minProfitBps: number; // Minimum profit in basis points ( 50 = 0.5%)
  maxSlippageBps: number; // Maximum slippage tolerance
  executionInterval: number; // Seconds between checks
  maxPositionSize: number; // Maximum trade size in USDC
}

export interface ExecutionSignal {
  execute: boolean;
  amount: number;
  reason: string;
  confidence: number; // 0 - 100
  expectedProfit: number;
  risk: "low" | "medium" | "high";
  metadata?: any;
}

export interface MarketData {
  inputToken: PublicKey;
  outputToken: PublicKey;
  price: number;
  volume24h: number;
  liquidityUsd: number;
  priceChange24h: number;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  signature: string;
  inputAmount: number;
  outputAmount: number;
  profit: number;
  gasCost: number;
  executionTime: number;
  error?: string;
}

// Base Strategy Interface
//
export abstract class BaseStrategy {
  protected strategyPubkey: PublicKey;
  protected parameters: StrategyParameters;
  protected program: Program;
  protected connection: Connection;
  protected wallet: Wallet;

  constructor(
    strategyPubkey: PublicKey,
    parameters: StrategyParameters,
    program: Program,
    connection: Connection,
    wallet: Wallet
  ) {
    this.strategyPubkey = strategyPubkey;
    this.parameters = parameters;
    this.program = program;
    this.connection = connection;
    this.wallet = wallet;
  }

  // Initialize strategy by loading from chain
  async initialize(): Promise<void> {
    // fetch strategy account from chain
    // const strategyAccount = await this.program.account.strategy.fetch(
    //   this.strategyPubkey
    // );
    // For testing we will put mock data value
    // output token is changed
    this.parameters = {
      // inputToken: strategyAccount.parameters.inputToken,
      // outputToken: strategyAccount.parameters.outputToken,
      // minProfitBps: strategyAccount.parameters.minProfitBps,
      // maxSlippageBps: strategyAccount.parameters.maxSlippageBps,
      // executionInterval: strategyAccount.parameters.executionInterval,
      // maxPositionSize: strategyAccount.parameters.maxPositionSize,
      // for testing
      inputToken: this.parameters.inputToken,
      outputToken: this.parameters.outputToken,
      minProfitBps: 50,
      maxSlippageBps: 100,
      executionInterval: 60,
      maxPositionSize: 1000000,
    };

    console.log(` Strategy initialized: ${this.strategyPubkey.toString()}`);
  }

  // core methods that must be implemented by each strategy
  abstract analyze(marketData: MarketData[]): Promise<ExecutionSignal>;
  abstract execute(signal: ExecutionSignal): Promise<ExecutionResult>;

  // Optional: Strategy-specific monitoring
  async monitor(): Promise<MarketData[]> {
    // Default implementation returns an empty array
    return [];
  }

  // Validate if execution should proceed
  protected validateSignal(signal: ExecutionSignal): boolean {
    if (!signal.execute) return false;

    if (signal.amount > this.parameters.maxPositionSize) {
      console.log(
        `Amount ${signal.amount} exceeds max position size ${this.parameters.maxPositionSize}`
      );
      return false;
    }

    if (signal.confidence < 50) {
      console.log(` Confidence ${signal.confidence}% too low`);
      return false;
    }

    return true;
  }

  // Record execution result on-chain
  protected async recordExecution(result: ExecutionResult): Promise<void> {
    try {
      // This would call record_execution_result instruction
      console.log(`Recording execution: ${result.signature}`);
      // await this.program.methods.recordExecutionResult(...)
    } catch (error) {
      console.error(`Failed to record execution: ${error}`);
    }
  }
}
export type StrategyCtor = new (
  strategyPubkey: PublicKey,
  parameters: StrategyParameters,
  program: Program,
  connection: Connection,
  wallet: Wallet
) => BaseStrategy;

// Strategy Registry
//
export class StrategyRegistry {
  private strategies: Map<string, StrategyCtor> = new Map();

  register(name: string, strategyClass: StrategyCtor): void {
    this.strategies.set(name, strategyClass);
    console.log(`Registered strategy: ${name}`);
  }

  get(name: string): StrategyCtor | undefined {
    return this.strategies.get(name);
  }

  listAll(): string[] {
    return Array.from(this.strategies.keys());
  }

  createInstance(
    name: string,
    strategyPubkey: PublicKey,
    parameters: StrategyParameters,
    program: Program,
    connection: Connection,
    wallet: Wallet
  ): BaseStrategy | null {
    const StrategyClass = this.strategies.get(name);
    if (!StrategyClass) {
      console.error(`Strategy not found: ${name}`);
      return null;
    }
    return new StrategyClass(
      strategyPubkey,
      parameters,
      program,
      connection,
      wallet
    );
  }
}

// Global registry instance
export const strategyRegistry = new StrategyRegistry();

// ============================================
// STRATEGY FACTORY
// ============================================

export class StrategyFactory {
  static async createFromChain(
    strategyPubkey: PublicKey,
    program: Program,
    connection: Connection,
    wallet: Wallet
  ): Promise<BaseStrategy | null> {
    try {
      // // Fetch strategy from chain
      // const strategyAccount = await program.account.strategy.fetch(
      //   strategyPubkey
      // );

      // // Get strategy type
      // const strategyType = Object.keys(strategyAccount.strategyType)[0];
      // console.log(`🏭 Creating strategy of type: ${strategyType}`);

      // // Create instance from registry
      // const strategy = strategyRegistry.createInstance(
      //   strategyType!,
      //   strategyPubkey,
      //   strategyAccount.parameters,
      //   program,
      //   connection,
      //   wallet
      // );
      //

      // test
      const parameters = {
        inputToken: new PublicKey(process.env.SOL_MINT!),
        outputToken: new PublicKey(process.env.USDC_MINT!),
        minProfitBps: 10, // Minimum profit in basis points ( 50 = 0.5%)
        maxSlippageBps: 20, // Maximum slippage tolerance
        executionInterval: 60, // Seconds between checks
        maxPositionSize: 5000, // Maximum trade size in USDC
      };
      const strategy = strategyRegistry.createInstance(
        "arbitrage",
        strategyPubkey,
        parameters,
        program,
        connection,
        wallet
      );
      if (strategy) {
        await strategy.initialize();
      }

      return strategy;
    } catch (error) {
      console.error("Error creating strategy:", error);
      return null;
    }
  }
}

// ============================================
// EXECUTION TRACKER
// ============================================

export class ExecutionTracker {
  private executions: Map<string, ExecutionResult[]> = new Map();

  record(strategyKey: string, result: ExecutionResult): void {
    const existing = this.executions.get(strategyKey) || [];
    existing.push(result);
    this.executions.set(strategyKey, existing);
  }

  getStats(strategyKey: string) {
    const executions = this.executions.get(strategyKey) || [];
    const successful = executions.filter((e) => e.success);

    return {
      total: executions.length,
      successful: successful.length,
      failed: executions.length - successful.length,
      successRate:
        executions.length > 0
          ? (successful.length / executions.length) * 100
          : 0,
      totalProfit: successful.reduce((sum, e) => sum + e.profit, 0),
      avgProfit:
        successful.length > 0
          ? successful.reduce((sum, e) => sum + e.profit, 0) / successful.length
          : 0,
      totalGasCost: executions.reduce((sum, e) => sum + e.gasCost, 0),
    };
  }

  getRecentExecutions(
    strategyKey: string,
    limit: number = 10
  ): ExecutionResult[] {
    const executions = this.executions.get(strategyKey) || [];
    return executions.slice(-limit);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateProfitBps(
  inputAmount: number,
  outputAmount: number
): number {
  if (inputAmount === 0) return 0;
  return ((outputAmount - inputAmount) / inputAmount) * 10000;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ============================================
// LOGGER
// ============================================

export class StrategyLogger {
  private prefix: string;

  constructor(strategyName: string) {
    this.prefix = `[${strategyName}]`;
  }

  info(message: string, data?: any): void {
    console.log(`${this.prefix} ℹ️  ${message}`, data || "");
  }

  success(message: string, data?: any): void {
    console.log(`${this.prefix} ✅ ${message}`, data || "");
  }

  error(message: string, error?: any): void {
    console.error(`${this.prefix} ❌ ${message}`, error || "");
  }

  warn(message: string, data?: any): void {
    console.warn(`${this.prefix} ⚠️  ${message}`, data || "");
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.log(`${this.prefix} 🔍 ${message}`, data || "");
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  BaseStrategy,
  StrategyRegistry,
  StrategyFactory,
  ExecutionTracker,
  StrategyLogger,
  strategyRegistry,
};
