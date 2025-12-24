import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaAiDefiAggregator } from "../target/types/solana_ai_defi_aggregator";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

// Configuration
const FEE_RATE_BPS = 30; // 0.3%
const PERFORMANCE_FEE_BPS = 1000; // 10%

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

  console.log("🚀 Initializing on Devnet...");
  console.log("Program ID:", program.programId.toString());
  console.log("Wallet:", provider.wallet.publicKey.toString());
  console.log("");

  // Get devnet USDC mint (or create test token)
  // Option 1: Use existing devnet USDC
  const usdcMint = new PublicKey(
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  );

  // Option 2: Or create your own test token
  // const usdcMint = await createMint(
  //   provider.connection,
  //   provider.wallet.payer,
  //   provider.wallet.publicKey,
  //   null,
  //   6 // USDC has 6 decimals
  // );

  console.log("USDC Mint:", usdcMint.toString());
  console.log("");

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), usdcMint.toBuffer()],
    program.programId
  );

  const [vaultUserState] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), vault.toBuffer()],
    program.programId
  );

  const [shareMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), vault.toBuffer()],
    program.programId
  );

  const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_token_account"), vault.toBuffer()],
    program.programId
  );

  const [feeVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault"), usdcMint.toBuffer()],
    program.programId
  );

  console.log("📍 Derived PDAs:");
  console.log("  Global State:", globalState.toString());
  console.log("  Vault:", vault.toString());
  console.log("  Share Mint:", shareMint.toString());
  console.log("  Vault Token Account:", vaultTokenAccount.toString());
  console.log("  Fee Vault:", feeVault.toString());
  console.log("");

  // ===========================================
  // Initialize Global State
  // ===========================================
  try {
    console.log("1️⃣ Initializing Global State...");
    await program.methods
      .initializeGlobalState(FEE_RATE_BPS)
      .accounts({
        admin: provider.wallet.publicKey,
        globalState: globalState,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    console.log("   ✅ Global State initialized");
  } catch (error) {
    if (error.message.includes("already in use")) {
      console.log("   ℹ️  Global State already initialized");
    } else {
      throw error;
    }
  }

  // ===========================================
  // Initialize Fee Vault
  // ===========================================
  try {
    console.log("2️⃣ Initializing Fee Vault...");
    await program.methods
      .initializeFeeVault()
      .accounts({
        authority: provider.wallet.publicKey,
        globalState: globalState,
        vaultAta: feeVault,
        inputMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      } as any)
      .rpc();
    console.log("   ✅ Fee Vault initialized");
  } catch (error) {
    if (error.message.includes("already in use")) {
      console.log("   ℹ️  Fee Vault already initialized");
    } else {
      throw error;
    }
  }

  // ===========================================
  // Initialize Main Vault
  // ===========================================
  try {
    console.log("3️⃣ Initializing Main Vault...");
    await program.methods
      .initializeVault(PERFORMANCE_FEE_BPS)
      .accounts({
        authority: provider.wallet.publicKey,
        vault: vault,
        tokenMint: usdcMint,
        shareMint: shareMint,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      } as any)
      .rpc();
    console.log("   ✅ Main Vault initialized");
  } catch (error) {
    if (error.message.includes("already in use")) {
      console.log("   ℹ️  Main Vault already initialized");
    } else {
      throw error;
    }
  }

  // ===========================================
  // Initialize Vault User State
  // ===========================================
  try {
    console.log("4️⃣ Initializing Vault User State...");
    await program.methods
      .registerUser()
      .accounts({
        user: vault,
        userState: vaultUserState,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    console.log("   ✅ Vault User State initialized");
  } catch (error) {
    if (error.message.includes("already in use")) {
      console.log("   ℹ️  Vault User State already initialized");
    } else {
      throw error;
    }
  }

  // ===========================================
  // Enable Strategy (optional)
  // ===========================================
  try {
    console.log("5️⃣ Enabling Strategy...");
    await program.methods
      .setStrategyEnabled(true)
      .accounts({
        authority: provider.wallet.publicKey,
        vault: vault,
      } as any)
      .rpc();
    console.log("   ✅ Strategy enabled");
  } catch (error) {
    console.log("   ⚠️  Could not enable strategy:", error.message);
  }

  // ===========================================
  // Summary
  // ===========================================
  console.log("");
  console.log("🎉 Initialization Complete!");
  console.log("");
  console.log("📋 Save these addresses for your frontend:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Program ID:     ", program.programId.toString());
  console.log("USDC Mint:      ", usdcMint.toString());
  console.log("Vault:          ", vault.toString());
  console.log("Share Mint:     ", shareMint.toString());
  console.log("Global State:   ", globalState.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("💡 Next Steps:");
  console.log("1. Update frontend/.env.local with Program ID");
  console.log(
    "2. Copy IDL to frontend: cp target/idl/your_program.json ../vault-frontend/src/idl/"
  );
  console.log("3. Get some devnet USDC from faucet");
  console.log("4. Run frontend: cd ../vault-frontend && npm run dev");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
