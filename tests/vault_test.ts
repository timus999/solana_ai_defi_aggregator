// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { SolanaAiDefiAggregator } from "../target/types/solana_ai_defi_aggregator";
// import {
//   PublicKey,
//   Keypair,
//   SystemProgram,
//   SYSVAR_RENT_PUBKEY,
// } from "@solana/web3.js";
// import {
//   TOKEN_PROGRAM_ID,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createMint,
//   mintTo,
//   getAccount,
//   getOrCreateAssociatedTokenAccount,
// } from "@solana/spl-token";
// import { assert, expect } from "chai";

// describe("Vault Module Tests", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const program = anchor.workspace
//     .solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

//   let authority: Keypair;
//   let user1: Keypair;
//   let user2: Keypair;
//   let tokenMint: PublicKey;
//   let vault: PublicKey;
//   let vaultBump: number;
//   let shareMint: PublicKey;
//   let vaultTokenAccount: PublicKey;

//   const PERFORMANCE_FEE_BPS = 1000; // 10%

//   before(async () => {
//     authority = Keypair.generate();
//     user1 = Keypair.generate();
//     user2 = Keypair.generate();

//     // Airdrop SOL
//     await airdrop(authority.publicKey, 10);
//     await airdrop(user1.publicKey, 10);
//     await airdrop(user2.publicKey, 10);

//     // Create token mint (e.g., USDC)
//     tokenMint = await createMint(
//       provider.connection,
//       authority,
//       authority.publicKey,
//       null,
//       6 // USDC decimals
//     );

//     console.log("Token Mint:", tokenMint.toString());

//     // Derive PDAs
//     [vault, vaultBump] = await PublicKey.findProgramAddress(
//       [Buffer.from("vault"), tokenMint.toBuffer()],
//       program.programId
//     );

//     [shareMint] = await PublicKey.findProgramAddress(
//       [Buffer.from("share_mint"), vault.toBuffer()],
//       program.programId
//     );

//     [vaultTokenAccount] = await PublicKey.findProgramAddress(
//       [Buffer.from("vault_token_account"), vault.toBuffer()],
//       program.programId
//     );

//     console.log("Vault:", vault.toString());
//     console.log("Share Mint:", shareMint.toString());
//     console.log("Vault Token Account:", vaultTokenAccount.toString());
//   });

//   async function airdrop(publicKey: PublicKey, amount: number) {
//     const sig = await provider.connection.requestAirdrop(
//       publicKey,
//       amount * anchor.web3.LAMPORTS_PER_SOL
//     );
//     await provider.connection.confirmTransaction(sig);
//   }

//   async function getTokenBalance(tokenAccount: PublicKey): Promise<number> {
//     const account = await getAccount(provider.connection, tokenAccount);
//     return Number(account.amount);
//   }

//   async function getVaultState() {
//     return await program.account.vault.fetch(vault);
//   }

//   // ============================================
//   // TEST 1: Initialize Vault
//   // ============================================

//   it("Should initialize vault successfully", async () => {
//     await program.methods
//       .initializeVault(PERFORMANCE_FEE_BPS)
//       .accounts({
//         authority: authority.publicKey,
//         vault: vault,
//         tokenMint: tokenMint,
//         shareMint: shareMint,
//         vaultTokenAccount: vaultTokenAccount,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,
//         rent: SYSVAR_RENT_PUBKEY,
//       })
//       .signers([authority])
//       .rpc();

//     const vaultState = await getVaultState();

//     assert.equal(
//       vaultState.authority.toString(),
//       authority.publicKey.toString()
//     );
//     assert.equal(vaultState.tokenMint.toString(), tokenMint.toString());
//     assert.equal(vaultState.totalAssets.toNumber(), 0);
//     assert.equal(vaultState.totalShares.toNumber(), 0);
//     assert.equal(vaultState.performanceFeeBps, PERFORMANCE_FEE_BPS);
//     assert.equal(vaultState.strategyEnabled, false);

//     console.log("✅ Vault initialized");
//   });

//   // ============================================
//   // TEST 2: First Deposit (1:1 ratio)
//   // ============================================

//   it("Should handle first deposit with 1:1 ratio", async () => {
//     const depositAmount = 1_000_000; // 1 USDC

//     // Mint tokens to user1
//     const user1TokenAccount = await getOrCreateAssociatedTokenAccount(
//       provider.connection,
//       authority,
//       tokenMint,
//       user1.publicKey
//     );

//     await mintTo(
//       provider.connection,
//       authority,
//       tokenMint,
//       user1TokenAccount.address,
//       authority,
//       depositAmount
//     );

//     // Get user's share account
//     const user1ShareAccount = await PublicKey.findProgramAddress(
//       [
//         user1.publicKey.toBuffer(),
//         TOKEN_PROGRAM_ID.toBuffer(),
//         shareMint.toBuffer(),
//       ],
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     // Deposit
//     await program.methods
//       .deposit(new anchor.BN(depositAmount))
//       .accounts({
//         user: user1.publicKey,
//         vault: vault,
//         userTokenAccount: user1TokenAccount.address,
//         vaultTokenAccount: vaultTokenAccount,
//         userShareAccount: user1ShareAccount[0],
//         shareMint: shareMint,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([user1])
//       .rpc();

//     // Verify vault state
//     const vaultState = await getVaultState();
//     assert.equal(vaultState.totalAssets.toNumber(), depositAmount);
//     assert.equal(vaultState.totalShares.toNumber(), depositAmount);

//     // Verify shares minted
//     const shareBalance = await getTokenBalance(user1ShareAccount[0]);
//     assert.equal(shareBalance, depositAmount);

//     console.log("✅ First deposit successful");
//     console.log(`   Assets: ${vaultState.totalAssets.toNumber()}`);
//     console.log(`   Shares: ${vaultState.totalShares.toNumber()}`);
//   });

//   // ============================================
//   // TEST 3: Second Deposit (Share Price > 1)
//   // ============================================

//   it("Should handle second deposit with correct share calculation", async () => {
//     // Simulate vault gaining value (e.g., from yield)
//     // In production, this would come from strategies
//     // For testing, we'll manually add tokens to vault
//     const profitAmount = 100_000; // 0.1 USDC profit (10% gain)
//     await mintTo(
//       provider.connection,
//       authority,
//       tokenMint,
//       vaultTokenAccount,
//       authority,
//       profitAmount
//     );

//     await program.methods
//       .testIncreaseAssets(new anchor.BN(1_000_000))
//       .accounts({
//         vault,
//         authority,
//       })
//       .rpc();

//     // Manually update vault state to reflect profit
//     // NOTE: In production, this happens via execute_strategy
//     // For testing, we'll do a new deposit which will see the increased balance

//     const depositAmount = 1_000_000; // 1 USDC
//     const user2TokenAccount = await getOrCreateAssociatedTokenAccount(
//       provider.connection,
//       authority,
//       tokenMint,
//       user2.publicKey
//     );

//     await mintTo(
//       provider.connection,
//       authority,
//       tokenMint,
//       user2TokenAccount.address,
//       authority,
//       depositAmount
//     );

//     const user2ShareAccount = await PublicKey.findProgramAddress(
//       [
//         user2.publicKey.toBuffer(),
//         TOKEN_PROGRAM_ID.toBuffer(),
//         shareMint.toBuffer(),
//       ],
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     const vaultStateBefore = await getVaultState();
//     console.log("Vault before 2nd deposit:");
//     console.log(`   Total assets: ${vaultStateBefore.totalAssets.toNumber()}`);
//     console.log(`   Total shares: ${vaultStateBefore.totalShares.toNumber()}`);

//     // Calculate expected shares
//     // shares = (deposit * totalShares) / totalAssets
//     const expectedShares = Math.floor(
//       (depositAmount * vaultStateBefore.totalShares.toNumber()) /
//         (vaultStateBefore.totalAssets.toNumber() + profitAmount)
//     );

//     await program.methods
//       .deposit(new anchor.BN(depositAmount))
//       .accounts({
//         user: user2.publicKey,
//         vault: vault,
//         userTokenAccount: user2TokenAccount.address,
//         vaultTokenAccount: vaultTokenAccount,
//         userShareAccount: user2ShareAccount[0],
//         shareMint: shareMint,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([user2])
//       .rpc();
//     const vaultStateAfter = await getVaultState();
//     console.log("Vault After 2nd deposit:");
//     console.log(`   Total assets: ${vaultStateAfter.totalAssets.toNumber()}`);
//     console.log(`   Total shares: ${vaultStateAfter.totalShares.toNumber()}`);

//     const shareBalance = await getTokenBalance(user2ShareAccount[0]);
//     console.log(`✅ Second deposit successful`);
//     console.log(`   Expected shares: ${expectedShares}`);
//     console.log(`   Actual shares: ${shareBalance}`);

//     // User2 should get fewer shares due to increased vault value
//     assert.isBelow(shareBalance, depositAmount);
//   });

//   // ============================================
//   // TEST 4: Withdraw
//   // ============================================

//   it("Should withdraw correctly", async () => {
//     const user1ShareAccount = await PublicKey.findProgramAddress(
//       [
//         user1.publicKey.toBuffer(),
//         TOKEN_PROGRAM_ID.toBuffer(),
//         shareMint.toBuffer(),
//       ],
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     const shareBalanceBefore = await getTokenBalance(user1ShareAccount[0]);
//     const sharesToWithdraw = Math.floor(shareBalanceBefore / 2); // Withdraw 50%

//     const user1TokenAccount = await getOrCreateAssociatedTokenAccount(
//       provider.connection,
//       authority,
//       tokenMint,
//       user1.publicKey
//     );

//     const tokenBalanceBefore = await getTokenBalance(user1TokenAccount.address);
//     const vaultStateBefore = await getVaultState();

//     // Calculate expected withdrawal
//     const expectedAssets = Math.floor(
//       (sharesToWithdraw * vaultStateBefore.totalAssets.toNumber()) /
//         vaultStateBefore.totalShares.toNumber()
//     );

//     await program.methods
//       .withdraw(new anchor.BN(sharesToWithdraw))
//       .accounts({
//         user: user1.publicKey,
//         vault: vault,
//         userTokenAccount: user1TokenAccount.address,
//         vaultTokenAccount: vaultTokenAccount,
//         userShareAccount: user1ShareAccount[0],
//         shareMint: shareMint,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .signers([user1])
//       .rpc();

//     const tokenBalanceAfter = await getTokenBalance(user1TokenAccount.address);
//     const shareBalanceAfter = await getTokenBalance(user1ShareAccount[0]);
//     const vaultStateAfter = await getVaultState();

//     const tokensReceived = tokenBalanceAfter - tokenBalanceBefore;

//     console.log("✅ Withdrawal successful");
//     console.log(`   Shares burned: ${sharesToWithdraw}`);
//     console.log(`   Expected tokens: ${expectedAssets}`);
//     console.log(`   Actual tokens: ${tokensReceived}`);
//     console.log(
//       `   Vault assets after: ${vaultStateAfter.totalAssets.toNumber()}`
//     );

//     assert.approximately(tokensReceived, expectedAssets, 1);
//     assert.equal(shareBalanceAfter, shareBalanceBefore - sharesToWithdraw);
//   });

//   // ============================================
//   // TEST 5: Strategy Execution (Stub)
//   // ============================================

//   it("Should enable strategy and execute stub", async () => {
//     // First, enable strategy
//     await program.methods
//       .setStrategyEnabled(true)
//       .accounts({
//         authority: authority.publicKey,
//         vault: vault,
//       })
//       .signers([authority])
//       .rpc();

//     const vaultState = await getVaultState();
//     assert.equal(vaultState.strategyEnabled, true);

//     console.log("✅ Strategy enabled");

//     // Execute strategy (stub)
//     const strategyAmount = 100_000;
//     const minOutput = 95_000;

//     await program.methods
//       .executeStrategy(
//         { jupiterSwap: {} }, // StrategyType enum
//         new anchor.BN(strategyAmount),
//         new anchor.BN(minOutput)
//       )
//       .accounts({
//         authority: authority.publicKey,
//         vault: vault,
//         vaultTokenAccount: vaultTokenAccount,
//       })
//       .signers([authority])
//       .rpc();

//     console.log("✅ Strategy executed (stub)");
//   });

//   // ============================================
//   // TEST 6: Unauthorized Strategy Execution
//   // ============================================

//   it("Should reject strategy execution from non-authority", async () => {
//     try {
//       await program.methods
//         .executeStrategy(
//           { jupiterSwap: {} },
//           new anchor.BN(100_000),
//           new anchor.BN(95_000)
//         )
//         .accounts({
//           authority: user1.publicKey, // Wrong authority!
//           vault: vault,
//           vaultTokenAccount: vaultTokenAccount,
//         })
//         .signers([user1])
//         .rpc();

//       assert.fail("Should have failed");
//     } catch (error) {
//       assert.include(error.message, "Unauthorized");
//       console.log("✅ Unauthorized access rejected");
//     }
//   });

//   // ============================================
//   // TEST 7: Zero Amount Deposit
//   // ============================================

//   it("Should reject zero amount deposit", async () => {
//     const user1TokenAccount = await getOrCreateAssociatedTokenAccount(
//       provider.connection,
//       authority,
//       tokenMint,
//       user1.publicKey
//     );

//     const user1ShareAccount = await PublicKey.findProgramAddress(
//       [
//         user1.publicKey.toBuffer(),
//         TOKEN_PROGRAM_ID.toBuffer(),
//         shareMint.toBuffer(),
//       ],
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     try {
//       await program.methods
//         .deposit(new anchor.BN(0))
//         .accounts({
//           user: user1.publicKey,
//           vault: vault,
//           userTokenAccount: user1TokenAccount.address,
//           vaultTokenAccount: vaultTokenAccount,
//           userShareAccount: user1ShareAccount[0],
//           shareMint: shareMint,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user1])
//         .rpc();

//       assert.fail("Should have failed");
//     } catch (error) {
//       assert.include(error.message, "ZeroAmount");
//       console.log("✅ Zero amount deposit rejected");
//     }
//   });

//   // ============================================
//   // TEST 8: Share Price Calculation
//   // ============================================

//   it("Should calculate share price correctly", async () => {
//     const vaultState = await getVaultState();

//     // Share price = (total_assets * 1e6) / total_shares
//     const expectedSharePrice = Math.floor(
//       (vaultState.totalAssets.toNumber() * 1_000_000) /
//         vaultState.totalShares.toNumber()
//     );

//     console.log("✅ Share price calculation verified");
//     console.log(`   Total assets: ${vaultState.totalAssets.toNumber()}`);
//     console.log(`   Total shares: ${vaultState.totalShares.toNumber()}`);
//     console.log(`   Share price: ${expectedSharePrice / 1_000_000}`);

//     // Share price should be > 1.0 due to the profit we added
//     assert.isAbove(expectedSharePrice, 1_000_000);
//   });
// });
