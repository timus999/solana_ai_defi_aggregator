
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaAiDefiAggregator} from "../target/types/solana_ai_defi_aggregator";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

  const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), usdcMint.toBuffer()],
    program.programId
  );

  console.log("🔍 Checking Vault State...\n");

  const vaultAccount = await program.account.vault.fetch(vault);

  console.log("Vault Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Authority:      ", vaultAccount.authority.toString());
  console.log("Token Mint:     ", vaultAccount.tokenMint.toString());
  console.log("Share Mint:     ", vaultAccount.shareMint.toString());
  console.log("Total Assets:   ", vaultAccount.totalAssets.toString());
  console.log("Total Shares:   ", vaultAccount.totalShares.toString());
  console.log("Strategy:       ", vaultAccount.strategyEnabled ? "✅ Enabled" : "❌ Disabled");
  console.log("Performance Fee:", vaultAccount.performanceFeeBps, "bps");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Vault is initialized and ready!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
