"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

import { BN, web3 } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import {
  USDC_MINT,
  VAULT_SEED,
  SHARE_MINT_SEED,
  VAULT_TOKEN_ACCOUNT_SEED,
  toTokenAmount,
  DECIMALS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/utils/constants";

export function useDeposit() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();

  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (amount: number) => {
      if (!publicKey || !program || !signTransaction) {
        setError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      setDepositing(true);
      setError(null);

      try {
        // Derive PDAs
        const [vault] = PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), USDC_MINT.toBuffer()],
          program.programId
        );

        const [shareMint] = PublicKey.findProgramAddressSync(
          [Buffer.from(SHARE_MINT_SEED), vault.toBuffer()],
          program.programId
        );

        const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_TOKEN_ACCOUNT_SEED), vault.toBuffer()],
          program.programId
        );

        // Get or create user's USDC account
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          publicKey as any,
          USDC_MINT,
          publicKey
        );

        // Get or create user's share account
        const userShareAccountAddress = await PublicKey.findProgramAddress(
          [
            publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            shareMint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Convert amount to token units
        const amountBN = new BN(toTokenAmount(amount, DECIMALS.USDC));

        console.log("Depositing:", {
          amount,
          amountBN: amountBN.toString(),
          vault: vault.toString(),
          userTokenAccount: userTokenAccount.address.toString(),
        });

        // Execute deposit
        const ix = await program.methods
          .deposit(amountBN)
          .accounts({
            user: publicKey,
            vault: vault,
            userTokenAccount: userTokenAccount.address,
            vaultTokenAccount: vaultTokenAccount,
            userShareAccount: userShareAccountAddress[0],
            shareMint: shareMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .transaction();

        const tx = new web3.Transaction().add(ix);

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash("finalized")
        ).blockhash;

        const signedTx = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        console.log("Deposit successful:", tx);
        return tx;
      } catch (err: any) {
        console.error("Deposit error:", err);
        const errorMsg = err.message || ERROR_MESSAGES.TRANSACTION_FAILED;
        setError(errorMsg);
        throw err;
      } finally {
        setDepositing(false);
      }
    },
    [publicKey, program, connection, signTransaction]
  );

  return {
    deposit,
    depositing,
    error,
  };
}
