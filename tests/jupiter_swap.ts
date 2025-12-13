import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaAiDefiAggregator } from "../target/types/solana_ai_defi_aggregator";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";

describe("Jupiter Swap Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

  // Test accounts
  let user: Keypair;
  let inputMint: PublicKey;
  let outputMint: PublicKey;
  let globalState: PublicKey;
  let globalStateBump: number;
  let userState: PublicKey;
  let userStateBump: number;
  let vaultAta: PublicKey;
  let vaultBump: number;
  let userInputAta: PublicKey;
  let userOutputAta: PublicKey;

  let admin;
  // Test constants
  const FEE_RATE_BPS = 30; // 0.3%
  const AMOUNT_IN = new anchor.BN(1_000_000); // 1 token (6 decimals)
  const MIN_AMOUNT_OUT = new anchor.BN(950_000); // 0.95 tokens
  const JUPITER_PROGRAM_ID = new PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );

  before(async () => {
    // Initialize test keypairs
    // user = Keypair.generate();
    // authority = Keypair.generate();
    admin = provider.wallet;
    user = anchor.web3.Keypair.generate();
    // Airdrop SOL to test accounts
    // await airdrop(provider.connection, user.publicKey, 10);
    // await airdrop(provider.connection, authority.publicKey, 10);

    // Create mints
    inputMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      6 // decimals
    );

    outputMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      6
    );

    console.log("Input Mint:", inputMint.toString());
    console.log("Output Mint:", outputMint.toString());

    // Derive PDAs
    [globalState, globalStateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      program.programId
    );

    [userState, userStateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    [vaultAta, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), inputMint.toBuffer()],
      program.programId
    );

    console.log("Global State:", globalState.toString());
    console.log("User State:", userState.toString());
    console.log("Vault ATA:", vaultAta.toString());

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: user.publicKey,
        lamports: 0.2 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );

    await provider.sendAndConfirm(tx);
    // Create user token accounts
    const userInputAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      inputMint,
      user.publicKey
    );
    userInputAta = userInputAccount.address;

    const userOutputAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      outputMint,
      user.publicKey
    );
    userOutputAta = userOutputAccount.address;

    // Mint tokens to user input account
    await mintTo(
      provider.connection,
      admin.payer,
      inputMint,
      userInputAta,
      admin.publicKey,
      AMOUNT_IN.toNumber() * 10 // Mint enough for multiple tests
    );

    console.log("User Input ATA:", userInputAta.toString());
    console.log("User Output ATA:", userOutputAta.toString());

    // Initialize global state
    await initializeGlobalState();

    // Initialize user state
    await initializeUserState();

    // Initialize vault ATA
    await initializeVault();
  });

  // ============================================
  // Helper Functions
  // ============================================

  async function airdrop(
    connection: any,
    publicKey: PublicKey,
    amount: number
  ) {
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);
  }

  async function initializeGlobalState() {
    try {
      await program.methods
        .initializeGlobalState(FEE_RATE_BPS)
        .accounts({
          admin: admin.publicKey,
          globalState: globalState,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Global state initialized");
    } catch (error) {
      console.log("Global state already initialized or error:", error.message);
    }
  }

  async function initializeUserState() {
    try {
      await program.methods
        .registerUser()
        .accounts({
          user: user.publicKey,
          userState: userState,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      console.log("User state initialized");
    } catch (error) {
      console.log("User state already initialized or error:", error.message);
    }
  }

  async function initializeVault() {
    try {
      await program.methods
        .initializeVault()
        .accounts({
          authority: admin.publicKey,
          globalState: globalState,
          vaultAta: vaultAta,
          inputMint: inputMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([admin.payer])
        .rpc();

      console.log("Vault initialized");
    } catch (error) {
      console.log("Vault already initialized or error:", error.message);
    }
  }

  function createMockJupiterInstruction(): Buffer {
    // Mock Jupiter swap instruction data
    // In production, you'd use actual Jupiter SDK to build this
    const discriminator = Buffer.from([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    ]);
    const mockData = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    return Buffer.concat([discriminator, mockData]);
  }

  function createAccountsMeta(
    accounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[]
  ) {
    return accounts.map((acc) => ({
      pubkey: acc.pubkey,
      isWritable: acc.isWritable,
      isSigner: acc.isSigner,
    }));
  }

  async function getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    const account = await getAccount(provider.connection, tokenAccount);
    return Number(account.amount);
  }

  async function getUserState() {
    return await program.account.userState.fetch(userState);
  }

  // ============================================
  // TEST 1: Successful Swap
  // ============================================

  it("Should execute a successful swap with fee collection", async () => {
    const balanceBefore = await getTokenBalance(userInputAta);
    const vaultBalanceBefore = await getTokenBalance(vaultAta);

    const swapIxData = createMockJupiterInstruction();
    const accountsMeta = createAccountsMeta([
      { pubkey: userInputAta, isWritable: true, isSigner: false },
      { pubkey: userOutputAta, isWritable: true, isSigner: false },
      { pubkey: user.publicKey, isWritable: false, isSigner: true },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ]);

    // Get remaining accounts for Jupiter CPI
    const remainingAccounts = [
      { pubkey: userInputAta, isWritable: true, isSigner: false },
      { pubkey: userOutputAta, isWritable: true, isSigner: false },
      { pubkey: user.publicKey, isWritable: false, isSigner: true },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    ];

    await program.methods
      .jupiterSwap(
        swapIxData,
        accountsMeta.map((am) => am.pubkey),
        AMOUNT_IN,
        MIN_AMOUNT_OUT
      )
      .accounts({
        user: user.publicKey,
        globalState: globalState,
        userState: userState,
        userInputAta: userInputAta,
        userOutputAta: userOutputAta,
        vaultAta: vaultAta,
        inputMint: inputMint,
        outputMint: outputMint,
        jupiterProgram: JUPITER_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .signers([user])
      .rpc();

    // Verify fee was collected
    const expectedFee = Math.ceil(
      (AMOUNT_IN.toNumber() * FEE_RATE_BPS) / 10000
    );
    const vaultBalanceAfter = await getTokenBalance(vaultAta);

    assert.equal(
      vaultBalanceAfter,
      vaultBalanceBefore + expectedFee,
      "Fee not collected correctly"
    );

    // Verify user input decreased
    // const balanceAfter = await getTokenBalance(userInputAta);
    // assert.equal(
    //   balanceAfter,
    //   balanceBefore - AMOUNT_IN.toNumber(),
    //   "Input tokens not deducted correctly"
    // );

    // Verify user state updated
    const userStateAccount = await getUserState();
    assert.equal(
      userStateAccount.totalVolume.toString(),
      AMOUNT_IN.toString(),
      "Total volume not updated"
    );
    assert.equal(
      userStateAccount.swaps.toNumber(),
      1,
      "Swap count not updated"
    );

    console.log("✅ Successful swap test passed");
  });

  // ============================================
  // TEST 2: Insufficient Balance
  // ============================================

  //   it("Should fail with insufficient balance", async () => {
  //     const excessiveAmount = new anchor.BN(1_000_000_000_000); // Way more than available

  //     const swapIxData = createMockJupiterInstruction();
  //     const accountsMeta = createAccountsMeta([
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ]);

  //     const remainingAccounts = [
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ];

  //     try {
  //       await program.methods
  //         .jupiterSwap(
  //           swapIxData,
  //           accountsMeta.map((am) => am.pubkey),
  //           excessiveAmount,
  //           MIN_AMOUNT_OUT
  //         )
  //         .accounts({
  //           user: user.publicKey,
  //           globalState: globalState,
  //           userState: userState,
  //           userInputAta: userInputAta,
  //           userOutputAta: userOutputAta,
  //           vaultAta: vaultAta,
  //           inputMint: inputMint,
  //           outputMint: outputMint,
  //           jupiterProgram: JUPITER_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //         })
  //         .remainingAccounts(remainingAccounts)
  //         .signers([user])
  //         .rpc();

  //       assert.fail("Transaction should have failed");
  //     } catch (error) {
  //       assert.include(
  //         error.message,
  //         "InsufficientBalance",
  //         "Wrong error message"
  //       );
  //       console.log("✅ Insufficient balance test passed");
  //     }
  //   });

  //   // ============================================
  //   // TEST 3: Protected Account in Remaining Accounts
  //   // ============================================

  //   it("Should fail when vault is in remaining accounts", async () => {
  //     const swapIxData = createMockJupiterInstruction();
  //     const accountsMeta = createAccountsMeta([
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: vaultAta, isWritable: true, isSigner: false }, // PROTECTED!
  //     ]);

  //     const remainingAccounts = [
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: vaultAta, isWritable: true, isSigner: false }, // PROTECTED!
  //     ];

  //     try {
  //       await program.methods
  //         .jupiterSwap(
  //           swapIxData,
  //           accountsMeta.map((am) => am.pubkey),
  //           AMOUNT_IN,
  //           MIN_AMOUNT_OUT
  //         )
  //         .accounts({
  //           user: user.publicKey,
  //           globalState: globalState,
  //           userState: userState,
  //           userInputAta: userInputAta,
  //           userOutputAta: userOutputAta,
  //           vaultAta: vaultAta,
  //           inputMint: inputMint,
  //           outputMint: outputMint,
  //           jupiterProgram: JUPITER_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //         })
  //         .remainingAccounts(remainingAccounts)
  //         .signers([user])
  //         .rpc();

  //       assert.fail("Transaction should have failed");
  //     } catch (error) {
  //       assert.include(
  //         error.message,
  //         "ProtectedAccountInRemainingAccounts",
  //         "Wrong error message"
  //       );
  //       console.log("✅ Protected account rejection test passed");
  //     }
  //   });

  //   // ============================================
  //   // TEST 4: Zero Amount
  //   // ============================================

  //   it("Should fail with zero amount", async () => {
  //     const zeroAmount = new anchor.BN(0);

  //     const swapIxData = createMockJupiterInstruction();
  //     const accountsMeta = createAccountsMeta([
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ]);

  //     const remainingAccounts = [
  //       { pubkey: userInputAta, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ];

  //     try {
  //       await program.methods
  //         .jupiterSwap(
  //           swapIxData,
  //           accountsMeta.map((am) => am.pubkey),
  //           zeroAmount,
  //           MIN_AMOUNT_OUT
  //         )
  //         .accounts({
  //           user: user.publicKey,
  //           globalState: globalState,
  //           userState: userState,
  //           userInputAta: userInputAta,
  //           userOutputAta: userOutputAta,
  //           vaultAta: vaultAta,
  //           inputMint: inputMint,
  //           outputMint: outputMint,
  //           jupiterProgram: JUPITER_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //         })
  //         .remainingAccounts(remainingAccounts)
  //         .signers([user])
  //         .rpc();

  //       assert.fail("Transaction should have failed");
  //     } catch (error) {
  //       assert.include(error.message, "InvalidAmount", "Wrong error message");
  //       console.log("✅ Zero amount test passed");
  //     }
  //   });

  //   // ============================================
  //   // TEST 5: Mint Mismatch
  //   // ============================================

  //   it("Should fail with mint mismatch", async () => {
  //     // Create a different user with wrong mint token account
  //     const wrongUser = Keypair.generate();
  //     await airdrop(provider.connection, wrongUser.publicKey, 5);

  //     // Create token account with output mint but pass as input
  //     const wrongAta = await getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       authority,
  //       outputMint, // Wrong mint!
  //       wrongUser.publicKey
  //     );

  //     // Mint some tokens
  //     await mintTo(
  //       provider.connection,
  //       authority,
  //       outputMint,
  //       wrongAta.address,
  //       authority,
  //       AMOUNT_IN.toNumber()
  //     );

  //     const swapIxData = createMockJupiterInstruction();
  //     const accountsMeta = createAccountsMeta([
  //       { pubkey: wrongAta.address, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ]);

  //     const remainingAccounts = [
  //       { pubkey: wrongAta.address, isWritable: true, isSigner: false },
  //       { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //     ];

  //     // Initialize wrong user state
  //     const [wrongUserState] = await PublicKey.findProgramAddress(
  //       [Buffer.from("user"), wrongUser.publicKey.toBuffer()],
  //       program.programId
  //     );

  //     try {
  //       await program.methods
  //         .initializeUserState()
  //         .accounts({
  //           user: wrongUser.publicKey,
  //           userState: wrongUserState,
  //           systemProgram: SystemProgram.programId,
  //         })
  //         .signers([wrongUser])
  //         .rpc();
  //     } catch (error) {
  //       // May already exist
  //     }

  //     try {
  //       await program.methods
  //         .jupiterSwap(
  //           swapIxData,
  //           accountsMeta.map((am) => am.pubkey),
  //           AMOUNT_IN,
  //           MIN_AMOUNT_OUT
  //         )
  //         .accounts({
  //           user: wrongUser.publicKey,
  //           globalState: globalState,
  //           userState: wrongUserState,
  //           userInputAta: wrongAta.address, // Wrong mint!
  //           userOutputAta: userOutputAta,
  //           vaultAta: vaultAta,
  //           inputMint: inputMint,
  //           outputMint: outputMint,
  //           jupiterProgram: JUPITER_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //         })
  //         .remainingAccounts(remainingAccounts)
  //         .signers([wrongUser])
  //         .rpc();

  //       assert.fail("Transaction should have failed");
  //     } catch (error) {
  //       assert.include(error.message, "MintMismatch", "Wrong error message");
  //       console.log("✅ Mint mismatch test passed");
  //     }
  //   });

  //   // ============================================
  //   // TEST 6: Multiple Swaps (State Accumulation)
  //   // ============================================

  //   it("Should accumulate state correctly over multiple swaps", async () => {
  //     const numSwaps = 3;
  //     const vaultBalanceBefore = await getTokenBalance(vaultAta);
  //     const userStateBefore = await getUserState();

  //     for (let i = 0; i < numSwaps; i++) {
  //       const swapIxData = createMockJupiterInstruction();
  //       const accountsMeta = createAccountsMeta([
  //         { pubkey: userInputAta, isWritable: true, isSigner: false },
  //         { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //       ]);

  //       const remainingAccounts = [
  //         { pubkey: userInputAta, isWritable: true, isSigner: false },
  //         { pubkey: userOutputAta, isWritable: true, isSigner: false },
  //       ];

  //       await program.methods
  //         .jupiterSwap(
  //           swapIxData,
  //           accountsMeta.map((am) => am.pubkey),
  //           AMOUNT_IN,
  //           MIN_AMOUNT_OUT
  //         )
  //         .accounts({
  //           user: user.publicKey,
  //           globalState: globalState,
  //           userState: userState,
  //           userInputAta: userInputAta,
  //           userOutputAta: userOutputAta,
  //           vaultAta: vaultAta,
  //           inputMint: inputMint,
  //           outputMint: outputMint,
  //           jupiterProgram: JUPITER_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //         })
  //         .remainingAccounts(remainingAccounts)
  //         .signers([user])
  //         .rpc();

  //       console.log(`Swap ${i + 1}/${numSwaps} completed`);
  //     }

  //     // Verify accumulated fees
  //     const expectedTotalFee = Math.ceil(
  //       (AMOUNT_IN.toNumber() * FEE_RATE_BPS * numSwaps) / 10000
  //     );
  //     const vaultBalanceAfter = await getTokenBalance(vaultAta);

  //     assert.equal(
  //       vaultBalanceAfter,
  //       vaultBalanceBefore + expectedTotalFee,
  //       "Total fees not collected correctly"
  //     );

  //     // Verify user state
  //     const userStateAfter = await getUserState();
  //     const expectedVolume = userStateBefore.totalVolume.add(
  //       AMOUNT_IN.muln(numSwaps)
  //     );
  //     const expectedSwaps = userStateBefore.swaps.toNumber() + numSwaps;

  //     assert.equal(
  //       userStateAfter.totalVolume.toString(),
  //       expectedVolume.toString(),
  //       "Total volume not accumulated correctly"
  //     );
  //     assert.equal(
  //       userStateAfter.swaps.toNumber(),
  //       expectedSwaps,
  //       "Swap count not accumulated correctly"
  //     );

  //     console.log("✅ Multiple swaps test passed");
  //   });

  //   // ============================================
  //   // TEST 7: Fee Calculation Verification
  //   // ============================================

  //   it("Should calculate fees correctly for various amounts", async () => {
  //     const testCases = [
  //       { amount: 1_000_000, feeRate: 30, expectedFee: 300 },
  //       { amount: 100, feeRate: 30, expectedFee: 1 }, // Rounds up
  //       { amount: 999, feeRate: 30, expectedFee: 3 }, // Rounds up
  //       { amount: 10_000_000, feeRate: 100, expectedFee: 10_000 },
  //     ];

  //     for (const testCase of testCases) {
  //       const calculatedFee = Math.ceil(
  //         (testCase.amount * testCase.feeRate) / 10000
  //       );

  //       assert.equal(
  //         calculatedFee,
  //         testCase.expectedFee,
  //         `Fee calculation failed for amount=${testCase.amount}, rate=${testCase.feeRate}`
  //       );
  //     }

  //     console.log("✅ Fee calculation test passed");
  //   });
});
