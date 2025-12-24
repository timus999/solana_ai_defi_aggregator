// import React, { useState } from "react";
// import * as anchor from "@coral-xyz/anchor";
// import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
// import { USDC_MINT, VAULT_SEED, SHARE_MINT_SEED } from "@/utils/constants";
// import { useProgram } from "../hooks/useProgram";
// import {
//   mintTo,
//   getAccount,
//   getOrCreateAssociatedTokenAccount,
//   createMint,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   getMint,
//   TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";

// export const InitializeVaultButton = () => {
//   const { program, provider, connection } = useProgram();
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const handleInitVault = async () => {
//     try {
//       setLoading(true);
//       setSuccess(null);
//       setError(null);

//       if (!program || !provider || !connection) {
//         throw new Error("Program, provider, or connection not initialized");
//       }

//       const wallet = provider.wallet as anchor.Wallet;

//       // Create USDC mint

//       const [globalState] = PublicKey.findProgramAddressSync(
//         [Buffer.from("global_state")],
//         program.programId
//       );

//       // Derive PDAs
//       const [vault] = PublicKey.findProgramAddressSync(
//         [Buffer.from("vault"), USDC_MINT.toBuffer()],
//         program.programId
//       );

//       // vault user useState
//       const [vaultUserState] = PublicKey.findProgramAddressSync(
//         [Buffer.from("user"), vault.toBuffer()],
//         program.programId
//       );

//       const [shareMint] = PublicKey.findProgramAddressSync(
//         [Buffer.from("share_mint"), vault.toBuffer()],
//         program.programId
//       );

//       const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
//         [Buffer.from("vault_token_account"), vault.toBuffer()],
//         program.programId
//       );

//       const [feeVault] = PublicKey.findProgramAddressSync(
//         [Buffer.from("fee_vault"), USDC_MINT.toBuffer()],
//         program.programId
//       );

//       // Call initializeVault
//       const ix = await program.methods
//         .initializeVault(1000) // performanceFeeBps, change if needed
//         .accounts({
//           authority: wallet.publicKey,
//           vault: vault,
//           tokenMint: usdcMintPubkey,
//           shareMint,
//           vaultTokenAccount,
//           systemProgram: SystemProgram.programId,
//           tokenProgram: TOKEN_PROGRAM_ID,
//         })
//         .signers([wallet.payer])
//         .transaction();
//       const ix2 = await program.methods
//         .initializeGlobalState(50) // performanceFeeBps, change if needed
//         .accounts({
//           admin: wallet.publicKey,
//           globalState: globalState,
//           systemProgram: SystemProgram.programId,
//         })
//         .transaction();
//       // const ix3 = await program.methods
//       //   .registerUser() // performanceFeeBps, change if needed
//       //   .accounts({
//       //     user: vault,
//       //     userState: vaultUserState,
//       //     systemProgram: SystemProgram.programId,
//       //   })
//       //   .signers([wallet.payer])
//       //   .transaction();

//       const ix4 = await program.methods
//         .initializeFeeVault()
//         .accounts({
//           authority: wallet.publicKey,
//           globalState: globalState,
//           vaultAta: feeVault,
//           inputMint: usdcMintPubkey,
//           systemProgram: SystemProgram.programId,
//           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           rent: SYSVAR_RENT_PUBKEY,
//         })
//         .signers([wallet.payer])
//         .transaction();

//       const tx = new anchor.web3.Transaction().add(ix);
//       tx.add(ix2);
//       // tx.add(ix3);
//       tx.add(ix4);

//       tx.feePayer = wallet.publicKey;
//       tx.recentBlockhash = (
//         await connection.getLatestBlockhash("finalized")
//       ).blockhash;

//       const signedTx = await wallet.signTransaction(tx);
//       const sig = await connection.sendRawTransaction(signedTx.serialize());
//       await connection.confirmTransaction(sig, "confirmed");
//       setSuccess(`Vault initialized! Tx: ${tx}`);
//     } catch (err) {
//       console.error(err);
//       setError(String(err) || "Error initializing vault");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <button
//         onClick={handleInitVault}
//         disabled={loading}
//         style={{ padding: "10px 20px", margin: "10px" }}
//       >
//         {loading ? "Initializing..." : "Initialize Vault"}
//       </button>
//       {success && <p style={{ color: "green" }}>{success}</p>}
//       {error && <p style={{ color: "red" }}>{error}</p>}
//     </div>
//   );
// };
