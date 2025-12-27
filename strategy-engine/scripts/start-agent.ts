// scripts/start-agent.ts
import { AIAgent, AgentManager } from "../src/agent/ai-agent-executor";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Wallet, Program, AnchorProvider } from "@coral-xyz/anchor";
import * as fs from "fs";

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Load wallet
  const keypairData = JSON.parse(
    fs.readFileSync(
      process.env.WALLET_PATH || "~/.config/solana/id.json",
      "utf-8"
    )
  );
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const wallet = new Wallet(keypair);
  // Setup Anchor Provider
  //
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load your program
  const IDL = JSON.parse(
    fs.readFileSync(
      "../../../target/idl/solana_ai_defi_aggregator.json",
      "utf-8"
    )
  );
  const program = new Program(IDL, provider);

  // Create agent
  const agent = new AIAgent("dev-agent", program, connection, wallet);

  // Add strategies
  const strategyPubkey = new PublicKey(process.argv[2]);
  await agent.addStrategy(strategyPubkey);

  // Start
  await agent.start();

  console.log("✅ Agent running. Press Ctrl+C to stop.");

  // Keep alive
  process.on("SIGINT", async () => {
    await agent.stop();
    process.exit(0);
  });
}

main().catch(console.error);
