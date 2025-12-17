// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { PublicKey } from "@solana/web3.js";
// import { SolanaAiDefiAggregator } from "../target/types/solana_ai_defi_aggregator";
// import { expect } from "chai";
// import {
//   TOKEN_PROGRAM_ID,
//   createMint,
//   createAssociatedTokenAccount,
//   mintTo,
// } from "@solana/spl-token";
// import { use } from "chai";

// describe("solana_ai_defi_aggregator", () => {
//   // Configure the client to use the local cluster.
//   //
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const program = anchor.workspace
//     .solanaAiDefiAggregator as Program<SolanaAiDefiAggregator>;

// let admin = provider.wallet;
// let user = anchor.web3.Keypair.generate();

//   let globalStatePda;
//   let userStatePda;

//   let inputMint;
//   let outputMint;

//   let userInputAta;
//   let userOutputAta;
//   const fakeJupiterProgram = anchor.web3.SystemProgram.programId;
//   console.log(fakeJupiterProgram.toString());
//   before("initialize variables", async () => {
//     // create mint
//     //
//     inputMint = await createMint(
//       provider.connection,
//       admin.payer,
//       admin.publicKey,
//       null,
//       6
//     );

//     outputMint = await createMint(
//       provider.connection,
//       admin.payer,
//       admin.publicKey,
//       null,
//       6
//     );

//     // create user ATAs
//     //
//     userInputAta = await createAssociatedTokenAccount(
//       provider.connection,
//       admin.payer,
//       inputMint,
//       user.publicKey
//     );

//     userOutputAta = await createAssociatedTokenAccount(
//       provider.connection,
//       admin.payer,
//       outputMint,
//       user.publicKey
//     );

//     await mintTo(
//       provider.connection,
//       admin.payer,
//       inputMint,
//       userInputAta,
//       admin.publicKey,
//       1_000_000
//     );

//     [globalStatePda] = PublicKey.findProgramAddressSync(
//       [Buffer.from("global_state")],
//       program.programId
//     );
//     [userStatePda] = PublicKey.findProgramAddressSync(
//       [Buffer.from("user"), user.publicKey.toBuffer()],
//       program.programId
//     );

// await provider.connection.confirmTransaction(
//   await provider.connection.requestAirdrop(user.publicKey, 1e9)
// );
//   });

//   it("Initialize Global State", async () => {
//     // Add your test here.
//     const tx = await program.methods
//       .initializeGlobalState(50)
//       .accounts({
//         admin: admin.publicKey,
//         globalState: globalStatePda,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .rpc();
//     console.log("Your transaction signature", tx);
//   });

//   it("Register User", async () => {
//     const tx = await program.methods
//       .registerUser()
//       .accounts({
//         userState: userStatePda,
//         user: user.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([user])
//       .rpc();
//     console.log("Your transaction signature", tx);
//   });
// });
