// Complete intregration  example
// How to use the strategy engine and AI agent
//
//

import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { AIAgent, AgentManager } from "../agent/ai-agent-executor.ts";
import {
  ArbitrageStrategy,
  YieldFarmingStrategy,
  RebalancingStrategy,
} from "../strategies/strategy-implementations.ts";

// example 1: Manual strategy execution
//
//
async function exampleManualStrategy() {
  console.log(" === Manual Strategy Execution Example === \n");

  // Setup connection
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // load Wallet
  const keypairFile = fs.readFileSync(
    "/home/timus/.config/solana/phantom.json",
    "utf-8"
  );
  const keypariData = JSON.parse(keypairFile);
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypariData));
  const wallet = new anchor.Wallet(keypair);

  // Setup Anchor Provider
  //
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load your program
  const IDL = JSON.parse(
    fs.readFileSync(
      "/home/timus/Desktop/internship/solana_ai_defi_aggregator/target/idl/solana_ai_defi_aggregator.json",
      "utf-8"
    )
  );
  const program = new anchor.Program(IDL, provider);

  // Create strategy instance
  //
  // const strategyPubkey = Keypair.generate().publicKey;
  const strategyPubkey = new PublicKey(
    "5SYCyApNSowQTmXkxeL3kaY4ShSqDYmvtheeAdUVdxcK"
  );
  //
  //
  const parameters = {
    inputToken: new PublicKey(process.env.USDC_MINT!),
    outputToken: new PublicKey(process.env.SOL_MINT!),
    minProfitBps: 50, // Minimum profit in basis points ( 50 = 0.5%)
    maxSlippageBps: 100, // Maximum slippage tolerance
    executionInterval: 60, // Seconds between checks
    maxPositionSize: 1000000,
  };
  const strategy = new ArbitrageStrategy(
    strategyPubkey,
    parameters,
    program,
    connection,
    wallet
  );

  // Initialize strategy
  await strategy.initialize();
  console.log("Strategy initialized\n");

  // Analyze Market
  const signal = await strategy.analyze([]);
  console.log(" Analysis result: ", {
    execute: signal.execute,
    reason: signal.reason,
    confidence: `${signal.confidence}%`,
    expectedProfit: `${signal.expectedProfit.toFixed(2)}`,
  });

  // Execute if signal is positive
  if (signal.execute) {
    console.log("\n Executing strategy...");
    const result = await strategy.execute(signal);

    console.log(" Execution complete:", {
      success: result.success,
      profit: `${result.profit.toFixed(2)}`,
      signature: result.signature,
    });
  }
}

// Example 2: Single AI AGENT
//
async function exampleSingleAgent() {
  console.log(" === Single AI agent example === \n");

  // setup
  // same as above
  // Setup connection
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // load Wallet
  const keypairFile = fs.readFileSync(
    "/home/timus/.config/solana/phantom.json",
    "utf-8"
  );
  const keypariData = JSON.parse(keypairFile);
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypariData));
  const wallet = new anchor.Wallet(keypair);

  // Setup Anchor Provider
  //
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load your program
  const IDL = JSON.parse(
    fs.readFileSync(
      "/home/timus/Desktop/internship/solana_ai_defi_aggregator/target/idl/solana_ai_defi_aggregator.json",
      "utf-8"
    )
  );
  const program = new anchor.Program(IDL, provider);

  // Create AI agent
  const agent = new AIAgent("agent-1", program, connection, wallet);

  // Configure agent
  agent.config.checkInterval = 30000; // Check every 30 seconds
  agent.config.maxConcurrentExecutions = 3;
  agent.config.enableRiskManagement = true;

  // Add strategies to monitor
  const strategy1 = new PublicKey(process.env.SOL_MINT!);
  const strategy2 = new PublicKey(process.env.USDC_MINT!);

  await agent.addStrategy(strategy1);
  await agent.addStrategy(strategy2);

  console.log(" Agent configured with 2 strategies\n");

  // Start agent (runs autonomously)
  await agent.start();
  console.log("🤖 Agent is now running autonomously!\n");

  // Let it run for 5 minutes
  await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

  // Check performance
  const performance = agent.getPerformance();
  console.log(" Agent Performance:", {
    executions: performance.totalExecutions,
    profit: `$${performance.totalProfit.toFixed(2)}`,
    successRate: `${performance.avgSuccessRate.toFixed(1)}%`,
  });

  // Stop agent
  await agent.stop();
  console.log(" Agent stopped");
}
export { exampleManualStrategy, exampleSingleAgent };
