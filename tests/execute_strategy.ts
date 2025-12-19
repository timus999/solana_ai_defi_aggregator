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
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  getMint,
} from "@solana/spl-token";
import { assert, expect } from "chai";

describe("Vault Strategy Execution Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

  // Test accounts
  let authority: Keypair;
  let user1: Keypair;
  let user2: Keypair;

  // Mints
  let usdcMint: PublicKey;
  let solMint: PublicKey;

  // PDAs
  let globalState: PublicKey;
  let vault: PublicKey;
  let vaultUserState: PublicKey;
  let shareMint: PublicKey;
  let vaultUsdcAccount: PublicKey;
  let vaultSolAccount: PublicKey;
  let feeVault: PublicKey;

  // Constants
  const JUPITER_PROGRAM_ID = new PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );
  const PERFORMANCE_FEE_BPS = 1000; // 10%
  const FEE_RATE_BPS = 30; // 0.3%
  const INITIAL_DEPOSIT = 10_000_000; // 10 USDC

  before(async () => {
    console.log("\n🔧 Setting up test environment...\n");

    // Generate keypairs
    authority = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    console.log("🔑 Generated keypairs:");
    console.log("Authority:", authority.publicKey.toString());
    console.log("User 1:", user1.publicKey.toString());
    console.log("User 2:", user2.publicKey.toString());

    // Airdrop SOL
    await airdrop(authority.publicKey, 10);
    await airdrop(user1.publicKey, 10);
    await airdrop(user2.publicKey, 10);

    // Create mints
    console.log("Creating token mints...");
    usdcMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6 // USDC decimals
    );

    solMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // SOL decimals
    );

    console.log("USDC Mint:", usdcMint.toString());
    console.log("SOL Mint:", solMint.toString());

    // Derive PDAs
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), usdcMint.toBuffer()],
      program.programId
    );

    [vaultUserState] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), vault.toBuffer()],
      program.programId
    );

    [shareMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), vault.toBuffer()],
      program.programId
    );

    [vaultUsdcAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token_account"), vault.toBuffer()],
      program.programId
    );

    [feeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault"), usdcMint.toBuffer()],
      program.programId
    );

    console.log("\nPDAs:");
    console.log("  Global State:", globalState.toString());
    console.log("  Vault:", vault.toString());
    console.log("  Vault User State:", vaultUserState.toString());
    console.log("  Share Mint:", shareMint.toString());
    console.log("  Vault USDC Account:", vaultUsdcAccount.toString());
    console.log("  Fee Vault:", feeVault.toString());

    // Initialize global state
    console.log("\nInitializing global state...");
    try {
      await program.methods
        .initializeGlobalState(FEE_RATE_BPS)
        .accounts({
          admin: authority.publicKey,
          globalState: globalState,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      console.log("✅ Global state initialized");
    } catch (e) {
      console.log("⚠️  Global state already initialized");
    }

    // Initialize fee vault
    console.log("Initializing fee vault...");
    try {
      await program.methods
        .initializeFeeVault()
        .accounts({
          authority: authority.publicKey,
          globalState: globalState,
          vaultAta: feeVault,
          inputMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      console.log("Fee vault initialized");
    } catch (e) {
      console.log("Fee vault already initialized");
    }

    // Initialize main vault
    console.log("Initializing main vault...");
    await program.methods
      .initializeVault(PERFORMANCE_FEE_BPS)
      .accounts({
        authority: authority.publicKey,
        vault: vault,
        tokenMint: usdcMint,
        shareMint: shareMint,
        vaultTokenAccount: vaultUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
    console.log("Main vault initialized");

    // Initialize vault user state
    console.log("Initializing vault user state...");
    await program.methods
      .registerUser()
      .accounts({
        authority: authority.publicKey,
        userState: vaultUserState,
        user: vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
    console.log("Vault user state initialized");

    // Enable strategy
    console.log("Enabling strategy...");
    await program.methods
      .setStrategyEnabled(true)
      .accounts({
        authority: authority.publicKey,
        vault: vault,
      })
      .signers([authority])
      .rpc();
    console.log("Strategy enabled");

    // Create vault's SOL token account
    console.log("Creating vault SOL account...");
    const vaultSolAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      solMint,
      vault,
      true // allowOwnerOffCurve for PDA
    );
    vaultSolAccount = vaultSolAccountInfo.address;
    console.log("  Vault SOL Account:", vaultSolAccount.toString());

    console.log("\nSetup complete!\n");
  });

  // Helper functions
  async function airdrop(publicKey: PublicKey, amount: number) {
    const sig = await provider.connection.requestAirdrop(
      publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  }

  async function getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    try {
      const account = await getAccount(provider.connection, tokenAccount);
      return Number(account.amount);
    } catch (e) {
      return 0;
    }
  }

  async function getVaultState() {
    return await program.account.vault.fetch(vault);
  }

  async function getUserShareBalance(user: PublicKey): Promise<number> {
    const [userShareAccount] = await PublicKey.findProgramAddress(
      [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), shareMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return await getTokenBalance(userShareAccount);
  }

  function createMockJupiterIx(): Buffer {
    // Mock Jupiter instruction data
    return Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  }

  // ============================================
  // TEST 1: User Deposits
  // ============================================

  it("Should allow user to deposit into vault", async () => {
    console.log("\nTest: User Deposit");

    const user1UsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      usdcMint,
      user1.publicKey
    );

    // Mint USDC to user
    await mintTo(
      provider.connection,
      authority,
      usdcMint,
      user1UsdcAccount.address,
      authority,
      INITIAL_DEPOSIT
    );

    const [user1ShareAccount] = PublicKey.findProgramAddressSync(
      [
        user1.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        shareMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("  Depositing:", INITIAL_DEPOSIT / 1_000_000, "USDC");

    await program.methods
      .deposit(new anchor.BN(INITIAL_DEPOSIT))
      .accounts({
        user: user1.publicKey,
        vault: vault,
        userTokenAccount: user1UsdcAccount.address,
        vaultTokenAccount: vaultUsdcAccount,
        userShareAccount: user1ShareAccount,
        shareMint: shareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const vaultState = await getVaultState();
    const shareBalance = await getTokenBalance(user1ShareAccount);

    console.log("Deposit successful");
    console.log(
      "  Vault total assets:",
      vaultState.totalAssets.toNumber() / 1_000_000,
      "USDC"
    );
    console.log("  User shares:", shareBalance / 1_000_000);

    assert.equal(vaultState.totalAssets.toNumber(), INITIAL_DEPOSIT);
    assert.equal(shareBalance, INITIAL_DEPOSIT);
  });

  // ============================================
  // TEST 2: Execute Strategy - Jupiter Swap
  // ============================================

  it("Should execute Jupiter swap strategy", async () => {
    console.log("\nTest: Execute Jupiter Swap Strategy");

    const swapAmount = 5_000_000; // Swap 5 USDC
    const minSolOutput = 20_000_000; // Expect at least 0.02 SOL

    const vaultStateBefore = await getVaultState();
    const vaultUsdcBalanceBefore = await getTokenBalance(vaultUsdcAccount);
    const vaultSolBalanceBefore = await getTokenBalance(vaultSolAccount);

    console.log("  Before swap:");
    console.log(
      "Vault total assets:",
      vaultStateBefore.totalAssets.toNumber() / 1_000_000,
      "USDC"
    );
    console.log(
      "Vault USDC balance:",
      vaultUsdcBalanceBefore / 1_000_000,
      "USDC"
    );
    console.log(
      "Vault SOL balance:",
      vaultSolBalanceBefore / 1_000_000_000,
      "SOL"
    );

    // In test mode, mint SOL to simulate swap output
    console.log("  Simulating Jupiter swap (minting SOL)...");
    await mintTo(
      provider.connection,
      authority,
      solMint,
      vaultSolAccount,
      authority,
      minSolOutput
    );

    const mockJupiterIx = createMockJupiterIx();
    const accountsMeta = [vaultUsdcAccount, vaultSolAccount];

    console.log("  Executing strategy...");
    await program.methods
      .executeStrategy(
        { jupiterSwap: {} },
        new anchor.BN(swapAmount),
        new anchor.BN(minSolOutput),
        mockJupiterIx,
        accountsMeta
      )
      .accounts({
        authority: authority.publicKey,
        vault: vault,
        globalState: globalState,
        vaultUserState: vaultUserState,
        vaultInputAta: vaultUsdcAccount,
        vaultOutputAta: vaultSolAccount,
        feeVaultAta: feeVault,
        inputMint: usdcMint,
        outputMint: solMint,
        jupiterProgram: JUPITER_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts([
        { pubkey: vaultUsdcAccount, isWritable: true, isSigner: false },
        { pubkey: vaultSolAccount, isWritable: true, isSigner: false },
      ])
      .signers([authority])
      .rpc();

    const vaultStateAfter = await getVaultState();
    const vaultUsdcBalanceAfter = await getTokenBalance(vaultUsdcAccount);
    const vaultSolBalanceAfter = await getTokenBalance(vaultSolAccount);
    const feeVaultBalance = await getTokenBalance(feeVault);

    console.log("  After swap:");
    console.log(
      "    Vault total assets:",
      vaultStateAfter.totalAssets.toNumber() / 1_000_000,
      "USDC"
    );
    console.log(
      "    Vault USDC balance:",
      vaultUsdcBalanceAfter / 1_000_000,
      "USDC"
    );
    console.log(
      "    Vault SOL balance:",
      vaultSolBalanceAfter / 1_000_000_000,
      "SOL"
    );
    console.log("    Fee collected:", feeVaultBalance / 1_000_000, "USDC");

    // Verify fee was collected (0.3% of 5 USDC = 0.015 USDC)
    const expectedFee = Math.ceil((swapAmount * FEE_RATE_BPS) / 10000);
    console.log("    Expected fee:", expectedFee / 1_000_000, "USDC");

    // Verify accounting
    assert.isBelow(
      vaultStateAfter.totalAssets.toNumber(),
      vaultStateBefore.totalAssets.toNumber(),
      "Vault assets should decrease after swap"
    );

    assert.isAbove(
      vaultSolBalanceAfter,
      vaultSolBalanceBefore,
      "Vault should have received SOL"
    );

    assert.isAbove(feeVaultBalance, 0, "Fee should have been collected");

    console.log(" Strategy executed successfully");
  });

  // ============================================
  // TEST 3: User Withdraws After Strategy
  // ============================================

  it("Should allow user to withdraw after strategy execution", async () => {
    console.log("\n💸 Test: User Withdrawal After Strategy");

    const user1ShareBalance = await getUserShareBalance(user1.publicKey);
    const sharesToWithdraw = Math.floor(user1ShareBalance / 2); // Withdraw 50%

    console.log("  User shares:", user1ShareBalance / 1_000_000);
    console.log("  Withdrawing:", sharesToWithdraw / 1_000_000, "shares");

    const user1UsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      usdcMint,
      user1.publicKey
    );

    const [user1ShareAccount] = PublicKey.findProgramAddressSync(
      [
        user1.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        shareMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const usdcBalanceBefore = await getTokenBalance(user1UsdcAccount.address);

    await program.methods
      .withdraw(new anchor.BN(sharesToWithdraw))
      .accounts({
        user: user1.publicKey,
        vault: vault,
        userTokenAccount: user1UsdcAccount.address,
        vaultTokenAccount: vaultUsdcAccount,
        userShareAccount: user1ShareAccount,
        shareMint: shareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();

    const usdcBalanceAfter = await getTokenBalance(user1UsdcAccount.address);
    const usdcReceived = usdcBalanceAfter - usdcBalanceBefore;

    console.log(" Withdrawal successful");
    console.log("  USDC received:", usdcReceived / 1_000_000, "USDC");

    assert.isAbove(usdcReceived, 0, "User should receive USDC");
  });

  // ============================================
  // TEST 4: Multiple Strategy Executions
  // ============================================

  it("Should handle multiple strategy executions", async () => {
    console.log("\nTest: Multiple Strategy Executions");

    const numExecutions = 3;
    const swapAmount = 1_000_000; // 1 USDC per swap
    const minOutput = 4_000_000; // 0.004 SOL

    for (let i = 0; i < numExecutions; i++) {
      console.log(`  Execution ${i + 1}/${numExecutions}...`);

      // Simulate swap output
      await mintTo(
        provider.connection,
        authority,
        solMint,
        vaultSolAccount,
        authority,
        minOutput
      );

      await program.methods
        .executeStrategy(
          { jupiterSwap: {} },
          new anchor.BN(swapAmount),
          new anchor.BN(minOutput),
          createMockJupiterIx(),
          [vaultUsdcAccount, vaultSolAccount]
        )
        .accounts({
          authority: authority.publicKey,
          vault: vault,
          globalState: globalState,
          vaultUserState: vaultUserState,
          vaultInputAta: vaultUsdcAccount,
          vaultOutputAta: vaultSolAccount,
          feeVaultAta: feeVault,
          inputMint: usdcMint,
          outputMint: solMint,
          jupiterProgram: JUPITER_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts([
          { pubkey: vaultUsdcAccount, isWritable: true, isSigner: false },
          { pubkey: vaultSolAccount, isWritable: true, isSigner: false },
        ])
        .signers([authority])
        .rpc();
    }

    const vaultUserStateData = await program.account.userState.fetch(
      vaultUserState
    );

    console.log("  Multiple executions completed");
    console.log("  Total vault swaps:", vaultUserStateData.swaps.toNumber());
    console.log(
      "  Total volume:",
      vaultUserStateData.totalVolume.toNumber() / 1_000_000,
      "USDC"
    );

    assert.isAtLeast(
      vaultUserStateData.swaps.toNumber(),
      numExecutions,
      "Swap count should reflect executions"
    );
  });

  // ============================================
  // TEST 5: Unauthorized Strategy Execution
  // ============================================

  it("Should reject strategy execution from non-authority", async () => {
    console.log("\nTest: Unauthorized Strategy Execution");

    try {
      await program.methods
        .executeStrategy(
          { jupiterSwap: {} },
          new anchor.BN(1_000_000),
          new anchor.BN(4_000_000),
          createMockJupiterIx(),
          [vaultUsdcAccount, vaultSolAccount]
        )
        .accounts({
          authority: user1.publicKey, // Wrong authority!
          vault: vault,
          globalState: globalState,
          vaultUserState: vaultUserState,
          vaultInputAta: vaultUsdcAccount,
          vaultOutputAta: vaultSolAccount,
          feeVaultAta: feeVault,
          inputMint: usdcMint,
          outputMint: solMint,
          jupiterProgram: JUPITER_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts([
          { pubkey: vaultUsdcAccount, isWritable: true, isSigner: false },
          { pubkey: vaultSolAccount, isWritable: true, isSigner: false },
        ])
        .signers([user1])
        .rpc();

      assert.fail("Should have failed with unauthorized error");
    } catch (error) {
      assert.include(error.message, "Unauthorized");
      console.log("Unauthorized access rejected");
    }
  });

  // ============================================
  // TEST 6: Strategy with Insufficient Assets
  // ============================================

  it("Should reject strategy when vault has insufficient assets", async () => {
    console.log("\nTest: Insufficient Assets");

    const vaultState = await getVaultState();
    const excessiveAmount = vaultState.totalAssets.toNumber() + 1_000_000;

    try {
      await program.methods
        .executeStrategy(
          { jupiterSwap: {} },
          new anchor.BN(excessiveAmount),
          new anchor.BN(1_000_000),
          createMockJupiterIx(),
          [vaultUsdcAccount, vaultSolAccount]
        )
        .accounts({
          authority: authority.publicKey,
          vault: vault,
          globalState: globalState,
          vaultUserState: vaultUserState,
          vaultInputAta: vaultUsdcAccount,
          vaultOutputAta: vaultSolAccount,
          feeVaultAta: feeVault,
          inputMint: usdcMint,
          outputMint: solMint,
          jupiterProgram: JUPITER_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .remainingAccounts([
          { pubkey: vaultUsdcAccount, isWritable: true, isSigner: false },
          { pubkey: vaultSolAccount, isWritable: true, isSigner: false },
        ])
        .signers([authority])
        .rpc();

      assert.fail("Should have failed with insufficient assets error");
    } catch (error) {
      assert.include(error.message, "InsufficientAssets");
      console.log("Insufficient assets error thrown");
    }
  });

  // ============================================
  // TEST 7: Final State Verification
  // ============================================

  it("Should verify final vault state", async () => {
    console.log("\nTest: Final State Verification");

    const vaultState = await getVaultState();
    const vaultUsdcBalance = await getTokenBalance(vaultUsdcAccount);
    const vaultSolBalance = await getTokenBalance(vaultSolAccount);
    const feeVaultBalance = await getTokenBalance(feeVault);
    const vaultUserStateData = await program.account.userState.fetch(
      vaultUserState
    );

    console.log("\n  Final Vault State:");
    console.log("  ==================");
    console.log(
      "  Total assets (accounting):",
      vaultState.totalAssets.toNumber() / 1_000_000,
      "USDC"
    );
    console.log(
      "  USDC balance (actual):",
      vaultUsdcBalance / 1_000_000,
      "USDC"
    );
    console.log(
      "  SOL balance (actual):",
      vaultSolBalance / 1_000_000_000,
      "SOL"
    );
    console.log(
      "  Total shares:",
      vaultState.totalShares.toNumber() / 1_000_000
    );
    console.log(
      "  Share price:",
      (
        vaultState.totalAssets.toNumber() / vaultState.totalShares.toNumber()
      ).toFixed(6)
    );
    console.log("  Strategy enabled:", vaultState.strategyEnabled);
    console.log("\n  Fees Collected:");
    console.log("  Fee vault balance:", feeVaultBalance / 1_000_000, "USDC");
    console.log("\n  Vault Statistics:");
    console.log("  Total swaps:", vaultUserStateData.swaps.toNumber());
    console.log(
      "  Total volume:",
      vaultUserStateData.totalVolume.toNumber() / 1_000_000,
      "USDC"
    );

    assert.isAbove(
      vaultState.totalShares.toNumber(),
      0,
      "Vault should have shares"
    );
    assert.isAbove(vaultSolBalance, 0, "Vault should hold SOL");
    assert.isAbove(feeVaultBalance, 0, "Fees should be collected");
    assert.isAbove(
      vaultUserStateData.swaps.toNumber(),
      0,
      "Swaps should be tracked"
    );

    console.log("\nAll state verifications passed");
  });
});
